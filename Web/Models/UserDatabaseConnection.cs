using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QueryTree.Models
{
    public enum UserDatabaseTypes { Admin = 1, [Display(Name ="Report Builder")] ReportBuilder = 2, [Display(Name = "Report Viewer")] ReportViewer = 3 }

    public class UserDatabaseConnection
    {
        [Key]
        public int UserDatabaseConnectionID { get; set; }

        [Display(Name = "Database")]
        public int DatabaseConnectionID { get; set; }
        
        public virtual DatabaseConnection DatabaseConnection { get; set; }
        public string ApplicationUserID{ get; set; }

        [ForeignKey("ApplicationUserID")]
        public virtual ApplicationUser ApplicationUser { get; set; }
        
        [Display(Name="Access Level")]
        public UserDatabaseTypes Type { get; set; }
        public string CreatedByID { get; set; }

        [ForeignKey("CreatedByID")]
        public virtual ApplicationUser CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }

        [Display(Name = "Email Address")]
        [DataType(DataType.EmailAddress)]
        public string InviteEmail { get; set; }
    }
}