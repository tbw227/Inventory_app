require('../loadEnv')

const connectDB = require('../db')
const prisma = require('../lib/prisma')

async function run() {
  const supplyName = 'ABC Dry Chemical'

  const client = await prisma.client.findFirst({
    where: { name: 'Kansas City Chiefs' },
    orderBy: { createdAt: 'asc' },
  })
  if (!client) throw new Error('Client not found: Kansas City Chiefs')
  const companyId = client.companyId

  const arrowHead = await prisma.location.findFirst({
    where: { companyId, clientId: client.id, name: 'ArrowHead Stadium' },
  })
  if (!arrowHead) throw new Error('Location not found: ArrowHead Stadium')

  const bobTruck = await prisma.location.findFirst({
    where: { companyId, clientId: client.id, name: "Bob's Truck" },
  })
  if (!bobTruck) throw new Error("Location not found: Bob's Truck")

  const ronTruck = await prisma.location.findFirst({
    where: { companyId, clientId: client.id, name: "Ron's Truck" },
  })
  if (!ronTruck) throw new Error("Location not found: Ron's Truck")

  const bob = await prisma.user.findFirst({
    where: { companyId, role: 'technician', name: { contains: 'Bob' } },
    orderBy: { createdAt: 'asc' },
  })
  if (!bob) throw new Error('Technician not found: Bob')

  const ron = await prisma.user.findFirst({
    where: { companyId, role: 'technician', name: { contains: 'Ron' } },
    orderBy: { createdAt: 'asc' },
  })
  if (!ron) throw new Error('Technician not found: Ron')

  const bobJobId = 'e89cdabf-69cb-4323-aef3-52d95e21853d'
  const bobJobExisting = await prisma.job.findFirst({
    where: { id: bobJobId, companyId },
  })
  if (!bobJobExisting) throw new Error(`Existing job not found: ${bobJobId}`)

  const bobJob = await prisma.job.update({
    where: { id: bobJobExisting.id },
    data: {
      assignedUserId: bob.id,
      description: `ArrowHead install — ${supplyName} (100) from Bob’s truck.`,
      plannedSupplies: [{ name: supplyName, quantity: 100 }],
      jobLocations: {
        deleteMany: {},
        create: [{ locationId: arrowHead.id }, { locationId: bobTruck.id }],
      },
    },
  })

  const ronJob = await prisma.job.create({
    data: {
      companyId,
      clientId: client.id,
      locationId: arrowHead.id,
      assignedUserId: ron.id,
      description: `ArrowHead install — ${supplyName} (100) from Ron’s truck.`,
      scheduledDate: new Date(),
      status: 'pending',
      plannedSupplies: [{ name: supplyName, quantity: 100 }],
      jobLocations: {
        create: [{ locationId: arrowHead.id }, { locationId: ronTruck.id }],
      },
    },
  })

  console.log('Split complete')
  console.log('Bob job:', bobJob.id)
  console.log('Ron job:', ronJob.id)
  console.log('Bob label:', `/jobs/${bobJob.id}/label?print=1`)
  console.log('Ron label:', `/jobs/${ronJob.id}/label?print=1`)
}

connectDB()
  .then(run)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Split error:', err)
    process.exit(1)
  })

