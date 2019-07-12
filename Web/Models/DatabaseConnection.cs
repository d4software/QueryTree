using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using QueryTree.Enums;

namespace QueryTree.Models
{
    public class DatabaseConnection
    {
        [Key]
        public int DatabaseConnectionID { get; set; }

		public int OrganisationId { get; set; }
		public virtual Organisation Organisation { get; set; }

		[Required]
        public DatabaseType Type { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public string Server { get; set; }

        [Required]
        public int Port { get; set; }

        [Required]
        public string Username { get; set; }

        [Display(Name = "Use SSH")]
        public bool UseSsh { get; set; }

        [Display(Name = "Use SSH Key")]
        public bool UseSshKey { get; set; }

        [Display(Name = "SSH Server")]
        public string SshServer { get; set; }

        [Display(Name = "SSH Port")]
        public int? SshPort { get; set; }

        [Display(Name = "SSH Username")]
        public string SshUsername { get; set; }

        public int? SshKeyFileID { get; set; }

        public virtual SshKeyFile SshKeyFile { get; set; }

        [Required]
        [Display(Name = "Database Name")]
        public string DatabaseName { get; set; }

        [DataType(DataType.MultilineText)]
        public string Description { get; set; }

        public DateTime CreatedOn { get; set; }

        public virtual IEnumerable<Query> Queries { get; set; }
    }
}