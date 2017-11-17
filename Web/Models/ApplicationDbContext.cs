using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace QueryTree.Models
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions options) : base(options)
        {
        }

        public DbSet<DatabaseConnection> DatabaseConnections { get; set; }
        public DbSet<SshKeyFile> SshKeyFiles { get; set; }
        public DbSet<Query> Queries { get; set; }
        public DbSet<UserDatabaseConnection> UserDatabaseConnections { get; set; }
        public DbSet<Organisation> Organisations { get; set; }
        public DbSet<OrganisationInvite> OrganisationInvites { get; set; }
        public DbSet<ScheduledReport> ScheduledReports { get; set; }
        public DbSet<ApplicationUser> ApplicationUsers { get; set; }
        public DbSet<Secret> Secrets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
