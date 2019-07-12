using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QueryTree.Models
{
    public class CustomizationConfiguration
    {
        public string SystemName { get; set; }
        public string SystemLogo { get; set; }
        public string ExtraCSS { get; set; }
        public bool AllowAdvancedQuery { get; set; }
        public Enums.DataStoreType DataStore { get; set; }
        public string BaseUri { get; set; }
        public Enums.AuthenticationMode AuthenticationMode { get; set; }
    }
}
