using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;


namespace QueryTree.ViewModels
{
    public class SettingsViewModel
    {
        [Display(Name = "Team Name")]
        public string OrganisationName { get; set; }
        [Display(Name = "Users")]
        public int NumberOfUsers { get; set; }
        [Display(Name = "Databases")]
        public int NumberOfConnections { get; set; }
        public IEnumerable<SettingsDatabaseConnectionViewModel> OtherConnections { get; set; }
    }

    public class SettingsDatabaseConnectionViewModel
    {
        public string ConnectionName { get; set; }
        public string ConnectionType { get; set; }
    }
}