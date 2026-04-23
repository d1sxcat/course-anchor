import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function seed() {
	const entities = ['user', 'note']
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any'] as const

	// Upsert all permissions
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				await prisma.permission.upsert({
					where: { action_entity_access: { action, entity, access } },
					create: { action, entity, access },
					update: {},
				})
			}
		}
	}

	// Upsert roles and connect permissions
	await prisma.role.upsert({
		where: { name: 'admin' },
		create: {
			name: 'admin',
			permissions: {
				connect: (
					await prisma.permission.findMany({
						where: { access: 'any' },
						select: { id: true },
					})
				).map(p => ({ id: p.id })),
			},
		},
		update: {},
	})

	await prisma.role.upsert({
		where: { name: 'user' },
		create: {
			name: 'user',
			permissions: {
				connect: (
					await prisma.permission.findMany({
						where: { access: 'own' },
						select: { id: true },
					})
				).map(p => ({ id: p.id })),
			},
		},
		update: {},
	})

	console.log('Seed complete.')
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
