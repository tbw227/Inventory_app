/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {'users'|'clients'|'supplies'|'locations'} modelKey
 * @param {object} where
 * @param {object} query - req.query
 * @param {{ orderBy?: object, include?: object, select?: object }} [options]
 */
async function prismaPaginate(prisma, modelKey, where, query, options = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const sortRaw = query.sort || options.defaultSort || 'createdAt';
  const desc = String(sortRaw).startsWith('-');
  const field = String(sortRaw).replace(/^-/, '');
  const orderBy = options.orderBy || { [field]: desc ? 'desc' : 'asc' };

  const delegate = prisma[modelKey];
  const [data, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...(options.include ? { include: options.include } : {}),
      ...(options.select ? { select: options.select } : {}),
    }),
    delegate.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = prismaPaginate;
