using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;


namespace QueryTree.Models
{
    public class Organisation
    {
        [Key]
        public int OrganisationId { get; set; }

        [Display(Name = "Organisation Name")]
        public string OrganisationName  { get; set; }
        public DateTime CreatedOn { get; set; }

        [Display(Name = "Users")]
        public int NumberOfUsers { get; set; }
        [Display(Name = "Databases")]
        public int NumberOfConnections { get; set; }
    }
}
