using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Linq;

namespace QueryTree.Engine
{
    public class Query
    {
        private List<NodeBase> Nodes;
        
        public Query(DatabaseType type, string queryJson, IList<ITableInfo> tables)
        {
            var nodeSettings = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(queryJson);
            Nodes = new List<NodeBase>();
            Nodes.AddRange(nodeSettings.Select(ns => CreateNode(ns, tables, type)));

            foreach (var node in Nodes.Where(n => (n is DataProcessorNode)))
            {
                var inputDict = Nodes.Where(n => (node as DataProcessorNode).Inputs.Contains(n.ClientId)).ToDictionary(n => n.ClientId);
                (node as DataProcessorNode).InputDict = inputDict;
            }

            foreach (var node in Nodes.Where(n => (n is IRequireConfiguration)))
            {
                (node as IRequireConfiguration).Configure(tables);
            }
        }

        private NodeBase CreateNode(Dictionary<string, object> nodeSettings, IList<ITableInfo> tables, DatabaseType type)
        {
            NodeBase n = null;

            // map the node_settings["Type"] to a node class
            if (nodeSettings["Type"].ToString() == "Data Table")
                n = new DatabaseTableNode();
            else if (nodeSettings["Type"].ToString() == "Sort")
                n = new SortNode();
            else if (nodeSettings["Type"].ToString() == "Select")
                n = new SelectNode();
            else if (nodeSettings["Type"].ToString() == "Filter")
                n = new FilterNode();
            else if (nodeSettings["Type"].ToString() == "Join")
                n = new JoinNode();
            else if (nodeSettings["Type"].ToString() == "Summarize")
                n = new SummarizeNode();
            else if (nodeSettings["Type"].ToString() == "Append")
                n = new AppendNode();
            else if (nodeSettings["Type"].ToString() == "Bar Chart" || nodeSettings["Type"].ToString() == "Line Chart" || nodeSettings["Type"].ToString() == "Pie Chart")
                n = new GraphNode();
            else if (nodeSettings["Type"].ToString() == "Extract")
                n = new ExtractNode();

            if (n != null)
            {
                n.ClientId = (string)nodeSettings["Id"];
                n.DatabaseType = type;

                // let this node setup update its settings
                n.UpdateSettings(nodeSettings);
            }

            return n;
        }

        public string GetSql(string nodeId, int? offset = null, int? limit = null)
        {
            var node = Nodes.FirstOrDefault(n => n.ClientId == nodeId);

            return node.GetFetchDataQuery(offset, limit);
        }

        public string GetRowCountSql(string nodeId)
        {
			var node = Nodes.FirstOrDefault(n => n.ClientId == nodeId);

            return node.GetCountQuerySql();
		}
    }
}
