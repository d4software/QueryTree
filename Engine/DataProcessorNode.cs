using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace QueryTree.Engine
{
    public abstract class DataProcessorNode : NodeBase
    {
        public IList<string> Inputs { get; set; }

        public IDictionary<string, NodeBase> InputDict { get; set; } // TODO: The engine must pass the nodes a map of their inputs before asking for a query from them

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("Inputs"))
            {
                Inputs = JsonConvert.DeserializeObject<List<string>>(settings["Inputs"].ToString());
            }
        }

        internal override void FetchOrderedDependencies(IList<NodeBase> dependencies)
        {
            base.FetchOrderedDependencies(dependencies);

            foreach (var inputId in Inputs)
            {
                InputDict[inputId].FetchOrderedDependencies(dependencies);
            }
        }

		/// <summary>
		/// Based on this node's inputs and settings, what columns will it 
        /// return, default implementation returns all the columns from its 
        /// first input
        /// </summary>
        /// <returns>The columns.</returns>
	    public override IList<string> GetColumns()
        {
            if (InputDict.Count > 0)
                return InputDict[Inputs[0]].GetColumns();
            else
                return new List<string>();
        }

		/// <summary>
		/// Based on this node's inputs and settings, what will the types of 
        /// its columns be
		/// </summary>
		/// <returns>The column types.</returns>
		public override IList<string> GetColumnTypes()
        {
            if (InputDict.Count > 0)
                return InputDict[Inputs[0]].GetColumnTypes();
            else
                return new List<string>();
        }
	}
}
