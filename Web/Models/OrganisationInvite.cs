using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations;


namespace QueryTree.Models
{
    public class OrganisationInvite
    {
        [Key]
        public int OrganisationInviteId { get; set; }

        public virtual ApplicationUser CreatedBy { get; set; }

        public DateTime CreatedOn { get; set; }

        public string InviteEmail { get; set; }

        public int OrganisationId { get; set; }

        public DateTime? AcceptedOn { get; set; }

        public DateTime? RejectedOn { get; set; }
    }
}