require('../loadEnv')

const connectDB = require('../db')
const prisma = require('../lib/prisma')
const { hashPassword } = require('../utils/auth')

function must(value, label) {
  if (!value) throw new Error(`Missing required value: ${label}`)
  return value
}

function stationLine({ itemName, quantity, note }) {
  return {
    item_name: itemName,
    quantity,
    stocked_at: new Date(),
    expires_at: null,
    is_fire_extinguisher: true,
    placement_note: note || '',
  }
}

async function run() {
  const company = await prisma.company.findFirst()
  must(company, 'company (run backend seed or point DATABASE_URL to your real DB)')

  const companyId = company.id

  // Techs (ensure Bob + Ron exist)
  const bob =
    (await prisma.user.findFirst({
      where: { companyId, role: 'technician', name: { contains: 'Bob' } },
      orderBy: { createdAt: 'asc' },
    })) ||
    (await prisma.user.findUnique({ where: { email: 'bob@example.com' } }))

  const assignedTech = must(bob, 'Bob technician user')

  let ron = await prisma.user.findFirst({
    where: { companyId, role: 'technician', name: { contains: 'Ron' } },
    orderBy: { createdAt: 'asc' },
  })

  if (!ron) {
    const ronHash = await hashPassword('Tech123!')
    ron = await prisma.user.create({
      data: {
        companyId,
        role: 'technician',
        name: 'Ron Tech',
        email: 'ron@example.com',
        passwordHash: ronHash,
        phone: '',
        bio: 'Field technician — installations and restock.',
        location: 'Kansas City, MO',
        birthday: '',
        skills: ['Install', 'Inventory'],
      },
    })
  }

  const supplyName = 'ABC Dry Chemical'

  // Ensure supply exists and on-hand is 400
  const existingSupply = await prisma.supply.findFirst({
    where: { companyId, name: supplyName },
  })

  const supply = existingSupply
    ? await prisma.supply.update({
        where: { id: existingSupply.id },
        data: { quantityOnHand: 400, category: existingSupply.category || 'Fire Extinguishers' },
      })
    : await prisma.supply.create({
        data: {
          companyId,
          name: supplyName,
          category: 'Fire Extinguishers',
          quantityOnHand: 400,
          reorderThreshold: 25,
        },
      })

  // Client: Kansas City Chiefs
  const clientName = 'Kansas City Chiefs'
  const clientLocation = 'ArrowHead Stadium, Kansas City, MO'

  const client =
    (await prisma.client.findFirst({ where: { companyId, name: clientName } })) ||
    (await prisma.client.create({
      data: {
        companyId,
        name: clientName,
        location: clientLocation,
        contactInfo: '',
        requiredSupplies: [{ name: supplyName, quantity: 400 }],
      },
    }))

  // Primary site: ArrowHead
  const arrowHead =
    (await prisma.location.findFirst({
      where: { companyId, clientId: client.id, name: { contains: 'ArrowHead' } },
      orderBy: { createdAt: 'asc' },
    })) ||
    (await prisma.location.create({
      data: {
        companyId,
        clientId: client.id,
        name: 'ArrowHead Stadium',
        address: clientLocation,
        locationCode: 'KC-ARROWHEAD',
        stationInventory: [
          // 200 already installed across Level 1 + Level 2
          stationLine({ itemName: supplyName, quantity: 100, note: 'Installed — Level 1' }),
          stationLine({ itemName: supplyName, quantity: 100, note: 'Installed — Level 2' }),
        ],
      },
    }))

  // Trucks as locations so they can be included in job label station list
  const bobTruck =
    (await prisma.location.findFirst({
      where: { companyId, clientId: client.id, name: "Bob's Truck" },
    })) ||
    (await prisma.location.create({
      data: {
        companyId,
        clientId: client.id,
        name: "Bob's Truck",
        address: 'Mobile inventory',
        locationCode: 'TRUCK-BOB',
        stationInventory: [stationLine({ itemName: supplyName, quantity: 100, note: 'Allocated stock — Bob' })],
      },
    }))

  const ronTruck =
    (await prisma.location.findFirst({
      where: { companyId, clientId: client.id, name: "Ron's Truck" },
    })) ||
    (await prisma.location.create({
      data: {
        companyId,
        clientId: client.id,
        name: "Ron's Truck",
        address: 'Mobile inventory',
        locationCode: 'TRUCK-RON',
        stationInventory: [stationLine({ itemName: supplyName, quantity: 100, note: 'Allocated stock — Ron' })],
      },
    }))

  // Job for the remaining installs (200)
  const job = await prisma.job.create({
    data: {
      companyId,
      clientId: client.id,
      locationId: arrowHead.id,
      assignedUserId: assignedTech.id,
      description: `ArrowHead install — remaining ${supplyName} units (200). 100 on Bob’s truck + 100 on Ron’s truck.`,
      scheduledDate: new Date(),
      status: 'pending',
      plannedSupplies: [{ name: supplyName, quantity: 200 }],
      jobLocations: {
        create: [{ locationId: arrowHead.id }, { locationId: bobTruck.id }, { locationId: ronTruck.id }],
      },
    },
  })

  console.log('Scenario created')
  console.log(`Company: ${company.name} (${companyId})`)
  console.log(`Client: ${client.name} (${client.id})`)
  console.log(`Supply: ${supply.name} on-hand=${supply.quantityOnHand} (${supply.id})`)
  console.log(`Locations:`)
  console.log(`  - ArrowHead: ${arrowHead.id}`)
  console.log(`  - Bob's Truck: ${bobTruck.id}`)
  console.log(`  - Ron's Truck: ${ronTruck.id}`)
  console.log(`Job: ${job.id}`)
  console.log(`Label URL (job): /jobs/${job.id}/label?print=1`)
}

connectDB()
  .then(run)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Scenario error:', err)
    process.exit(1)
  })

