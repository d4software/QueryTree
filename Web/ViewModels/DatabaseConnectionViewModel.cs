using System;
using System.ComponentModel.DataAnnotations;
using QueryTree.Models;
using QueryTree.Enums;

namespace QueryTree.ViewModels
{
    public class DatabaseConnectionViewModel
    {
		public DatabaseConnectionViewModel()
		{
		}

        public DatabaseConnectionViewModel(DatabaseConnection connection)
        {
            this.DatabaseConnectionID = connection.DatabaseConnectionID;
            this.Type = connection.Type;
            this.Name = connection.Name;
            this.Server = connection.Server;
            this.Port = connection.Port;
            this.Username = connection.Username;
            this.UseSsh = connection.UseSsh;
            this.UseSshKey = connection.UseSshKey;
            this.SshServer = connection.SshServer;
            this.SshPort = connection.SshPort;
            this.SshUsername = connection.SshUsername;
            this.SshKeyFileID = connection.SshKeyFileID;
            this.SshKeyFile = connection.SshKeyFile;
            this.DatabaseName = connection.DatabaseName;
            this.Description = connection.Description;
        }

        public int DatabaseConnectionID { get; set; }

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

        [Display(Name = "Password")]
        public string DbPssword { get; set; }

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

        [Display(Name = "SSH Password")]
        public string SshPassword { get; set; }

        public int? SshKeyFileID { get; set; }

        public SshKeyFile SshKeyFile { get; set; }

        [Required]
        [Display(Name = "Database Name")]
        public string DatabaseName { get; set; }

        [DataType(DataType.MultilineText)]
        public string Description { get; set; }
    }
}