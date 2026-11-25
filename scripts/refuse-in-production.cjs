// Guard for the npm scripts that must never run in production (prisma migrate dev, prisma db seed).
// The production image only needs `npm run db:deploy` (prisma migrate deploy). Usage in package.json:
//   "db:migrate": "node scripts/refuse-in-production.cjs && prisma migrate dev"
if (process.env.NODE_ENV === 'production') {
  console.error(
    'Este comando no se puede ejecutar con NODE_ENV=production (crea migraciones o carga datos de prueba). ' +
      'En producción solo se usa "npm run db:deploy" (prisma migrate deploy).',
  );
  process.exit(1);
}
