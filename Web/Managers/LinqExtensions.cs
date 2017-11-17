using System;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Linq.Expressions;

namespace QueryTree
{
    public static class LinqExtensions
    {
        public static void RemoveWhere<TEntity>(this DbSet<TEntity> dbSet, Expression<Func<TEntity, bool>> predicate)
            where TEntity : class
        {
            dbSet.RemoveRange(dbSet.Where(predicate));
        }
    }
}