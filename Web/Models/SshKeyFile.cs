using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
namespace QueryTree.Models
{
    public class SshKeyFile
    {
        [Key]
        public int Id { get; set; }

        public string Filename { get; set; }

        public string ContentType { get; set; }

        public virtual ApplicationUser CreatedBy { get; set; }

        public DateTime CreatedOn { get; set; }
    }
}