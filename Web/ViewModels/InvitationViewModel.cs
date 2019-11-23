using QueryTree.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;


namespace QueryTree.ViewModels
{
    public class InvitationViewModel
    {
        public InvitationViewModel() 
        {
            DatabasesMerged = new List<string>();
            DatabasesLost = new List<string>();
        }

        public string OrganisationName { get; set; }

        public List<string> Invitees { get; set; }

        public string Description
        {
            get
            {
                string inviteeSummary = string.Empty;
                if (Invitees.Count == 1)
                {
                    inviteeSummary = Invitees.First();
                }
                else if (Invitees.Count > 1)
                {

                    inviteeSummary = string.Format("{0} and {1}", Invitees.First(), Invitees.Last());
                }
                else if (Invitees.Count > 1)
                {

                    inviteeSummary = string.Format("{0}, and {1}", string.Join(", ", Invitees.Take(Invitees.Count - 1)), Invitees.Last());
                }

                string organisationName = this.OrganisationName;
                if (string.IsNullOrEmpty(organisationName))
                {
                    organisationName = "an organisation";
                }

                if (IsOrganisationAdmin)
                {
                    return string.Format("You have been invited to become an administrator of {0} by {1}", organisationName, inviteeSummary);
                }
                else
                {
                    return string.Format("You have been invited to join {0} by {1}", organisationName, inviteeSummary);
                }
            }
        }

        public int OrganisationId { get; set; }

        public int OrganisationInviteId { get; set; }

        public bool IsOrganisationAdmin { get; set; }

        public List<string> DatabasesMerged { get; set; }
        public List<string> DatabasesLost { get; set; }
    }
}