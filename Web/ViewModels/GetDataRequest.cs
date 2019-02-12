using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QueryTree.ViewModels
{
    public class GetDataRequest
    {
        public int Draw { get; set; }
        public int Start { get; set; }
        public int Length { get; set; }
    }
}
