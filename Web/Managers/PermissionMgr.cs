using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Models;


namespace QueryTree.Managers
{
    public class PermissionMgr
    {
        public static List<UserDatabaseTypes> GetDatabasePermissions(DatabaseConnection database, IEnumerable<UserDatabaseConnection> userPermissions)
        {
            List<UserDatabaseTypes> results = new List<UserDatabaseTypes>();
            
            results = userPermissions
                .Where(p => p.DatabaseConnectionID == database.DatabaseConnectionID)
                .Select(p => p.Type)
                .ToList();
            
            return results;
        }

        private static readonly UserDatabaseTypes[] ViewQueryDatabaseTypes = new[]
        {
                UserDatabaseTypes.Admin,
                UserDatabaseTypes.ReportBuilder,
                UserDatabaseTypes.ReportViewer
        };

        private static readonly UserDatabaseTypes[] ModifyQueryDatabaseTypes = new[]
        {
                UserDatabaseTypes.Admin,
                UserDatabaseTypes.ReportBuilder
        };

        public static bool UserCanModifyQuery(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ModifyQueryDatabaseTypes.Contains(p));
        }

        public static bool UserCanViewQuery(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ViewQueryDatabaseTypes.Contains(p));
        }

        private static readonly UserDatabaseTypes[] ModifyDatabaseTypes = new[]
        {
            UserDatabaseTypes.Admin
        };

        private static readonly UserDatabaseTypes[] ViewDatabaseTypes = new[]
        {
            UserDatabaseTypes.Admin,
            UserDatabaseTypes.ReportBuilder,
            UserDatabaseTypes.ReportViewer
        };

        public static bool UserCanViewDatabase(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ViewDatabaseTypes.Contains(p));
        }        

        public static bool UserCanModifyDatabase(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ModifyDatabaseTypes.Contains(p));
        }


        private static readonly UserDatabaseTypes[] ManageDatabaseUserTypes = new[]
        {
            UserDatabaseTypes.Admin
        };

        public static bool UserCanManageDatabaseAccess(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ManageDatabaseUserTypes.Contains(p));
        }

        public static bool UserCanDeleteDatabase(IEnumerable<UserDatabaseConnection> userPermissions, DatabaseConnection database)
        {
            var permissions = GetDatabasePermissions(database, userPermissions);

            return permissions.Any(p => ModifyDatabaseTypes.Contains(p));
        }

    }
}