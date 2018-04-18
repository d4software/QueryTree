using QueryTree.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using QueryTree.Enums;


namespace QueryTree.ViewModels
{
    public class DatabaseConnectionDetailsViewModel
    {
        public int DatabaseConnectionID { get; set; }
        public string Name { get; set; }
		public DatabaseType Type { get; set; }
        public string Server { get; set; }
        public int Port { get; set; }
        public string Username { get; set; }
        [Display(Name = "Use SSH")]
        public bool UseSsh { get; set; }
        [Display(Name = "SSH Server")]
        public string SshServer { get; set; }
        [Display(Name = "SSH Port")]
        public int? SshPort { get; set; }
        [Display(Name = "SSH Username")]
        public string SshUsername { get; set; }
        [Display(Name = "Database Name")]
        public string DatabaseName { get; set; }
        [DataType(DataType.MultilineText)]
        public string Description { get; set; }
        public IEnumerable<DatabaseConnectionQueriesDetailsViewModel> SavedQueries;
        [Display(Name = "Organisation")]
        public string OrganisationName { get; set; }
        public List<UserDatabaseConnection> AccessUsers { get; set; }
    }

    public class DatabaseConnectionQueriesDetailsViewModel
    {
        public int QueryID { get; set; }
        public string Name { get; set; }
		public string Description { get; set; }
        public virtual ApplicationUser CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public bool IsSimpleQuery { get; set; }
        public virtual ApplicationUser LastEditedBy { get; set; }
        public DateTime? LastEditedOn { get; set; }
    }
}