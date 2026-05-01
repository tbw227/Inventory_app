require('../loadEnv')

const connectDB = require('../db')
const prisma = require('../lib/prisma')
const { hashPassword } = require('../utils/auth')

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

async function ensureTech({ companyId, name, email }) {
  const existing = await prisma.user.findFirst({
    where: { companyId, role: 'technician', email },
  })
  if (existing) return existing

  const passwordHash = await hashPassword('Tech123!')
  return prisma.user.create({
    data: {
      companyId,
      role: 'technician',
      name,
      email,
      passwordHash,
      phone: '',
      bio: 'Field technician',
      location: 'Kansas City, MO',
      birthday: '',
      skills: ['Install', 'Inventory'],
    },
  })
}

async function run() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!company) throw new Error('No company found (seed DB first or point DATABASE_URL to your DB)')

  const companyId = company.id
  const supplyName = 'ABC Dry Chemical'

  // Ensure techs
  const bob =
    (await prisma.user.findFirst({
      where: { companyId, role: 'technician', name: { contains: 'Bob' } },
      orderBy: { createdAt: 'asc' },
    })) || (await ensureTech({ companyId, name: 'Bob Tech', email: 'bob@example.com' }))

  const ron =
    (await prisma.user.findFirst({
      where: { companyId, role: 'technician', name: { contains: 'Ron' } },
      orderBy: { createdAt: 'asc' },
    })) || (await ensureTech({ companyId, name: 'Ron Tech', email: 'ron@example.com' }))

  // Ensure supply exists; on-hand 0 because all 400 are allocated in this scenario.
  const existingSupply = await prisma.supply.findFirst({
    where: { companyId, name: supplyName },
  })
  const supply = existingSupply
    ? await prisma.supply.update({
        where: { id: existingSupply.id },
        data: { quantityOnHand: 0, category: existingSupply.category || 'Fire Extinguishers' },
      })
    : await prisma.supply.create({
        data: {
          companyId,
          name: supplyName,
          category: 'Fire Extinguishers',
          quantityOnHand: 0,
          reorderThreshold: 25,
        },
      })

  // Client
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

  // Locations
  const arrowHead =
    (await prisma.location.findFirst({
      where: { companyId, clientId: client.id, name: 'ArrowHead Stadium' },
    })) ||
    (await prisma.location.create({
      data: {
        companyId,
        clientId: client.id,
        name: 'ArrowHead Stadium',
        address: clientLocation,
        locationCode: 'KC-ARROWHEAD',
        stationInventory: [
          stationLine({ itemName: supplyName, quantity: 100, note: 'Installed — Level 1' }),
          stationLine({ itemName: supplyName, quantity: 100, note: 'Installed — Level 2' }),
        ],
      },
    }))

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

  // Jobs (split)
  async function upsertJob({ assignedUserId, description, locations }) {
    const existing = await prisma.job.findFirst({
      where: {
        companyId,
        clientId: client.id,
        assignedUserId,
        description: { contains: `ArrowHead install — ${supplyName} (100)` },
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      return prisma.job.update({
        where: { id: existing.id },
        data: {
          description,
          plannedSupplies: [{ name: supplyName, quantity: 100 }],
          locationId: arrowHead.id,
          jobLocations: {
            deleteMany: {},
            create: locations.map((locationId) => ({ locationId })),
          },
        },
      })
    }

    return prisma.job.create({
      data: {
        companyId,
        clientId: client.id,
        locationId: arrowHead.id,
        assignedUserId,
        description,
        scheduledDate: new Date(),
        status: 'pending',
        plannedSupplies: [{ name: supplyName, quantity: 100 }],
        jobLocations: {
          create: locations.map((locationId) => ({ locationId })),
        },
      },
    })
  }

  const bobJob = await upsertJob({
    assignedUserId: bob.id,
    description: `ArrowHead install — ${supplyName} (100) from Bob’s truck.`,
    locations: [arrowHead.id, bobTruck.id],
  })

  const ronJob = await upsertJob({
    assignedUserId: ron.id,
    description: `ArrowHead install — ${supplyName} (100) from Ron’s truck.`,
    locations: [arrowHead.id, ronTruck.id],
  })

  console.log('Scenario ready (split jobs)')
  console.log(`Company: ${company.name} (${companyId})`)
  console.log(`Client: ${client.name} (${client.id})`)
  console.log(`Supply: ${supply.name} on-hand=${supply.quantityOnHand} (${supply.id})`)
  console.log(`Locations: ArrowHead=${arrowHead.id} | BobTruck=${bobTruck.id} | RonTruck=${ronTruck.id}`)
  console.log(`Bob job: ${bobJob.id} (label: /jobs/${bobJob.id}/label?print=1)`)
  console.log(`Ron job: ${ronJob.id} (label: /jobs/${ronJob.id}/label?print=1)`)
}

connectDB()
  .then(run)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Scenario error:', err)
    process.exit(1)
  })

