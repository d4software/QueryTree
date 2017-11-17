using QueryTree.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;


namespace QueryTree.ViewModels
{
    public class PermissionViewModel
    {
        public string ApplicationUserID { get; set; }

        [Required(ErrorMessage = "The email address is required")]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string Email { get; set; }

        public bool IsOrganisationAdmin { get; set; }
        
        [Display(Name ="Organisation Name")]
        public string OrganisationName { get; set; }

        public class DatabasePermission
        {
            public int DatabaseId { get; set; }
            public string DatabaseName { get; set; }
            public string AccessType { get; set; }
        }

        public List<DatabasePermission> DatabasePermissions { get; set; }

        public bool OganisationHasDatabases { get { return OrganisationDatabaseCount > 0; } }

        public int OrganisationDatabaseCount { get; set; }
    }
}