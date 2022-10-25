class XPathHelper
{	
	constructor(nsResolver)
	{		
		this._nsResolver = nsResolver;	
	}
	
	getSingleNode(parentNode, xpath)
	{		
		var doc = (!parentNode.ownerDocument)? parentNode : parentNode.ownerDocument;		
		var nodesSnapshot = doc.evaluate(xpath, parentNode, this._nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);		
		return nodesSnapshot.snapshotItem(0);
	}

	getNodes(parentNode, xpath)
	{		
		var doc = (!parentNode.ownerDocument)? parentNode : parentNode.ownerDocument;		
		var nodesSnapshot = doc.evaluate(xpath, parentNode, this._nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
		var nodes = []
		for (var i=0;i<nodesSnapshot.snapshotLength;i++) nodes[i] = nodesSnapshot.snapshotItem(i)
		return nodes;
	}
	
	getSingleAttributeValue(parentNode, xpath)
	{	 
		var doc = (!parentNode.ownerDocument)? parentNode : parentNode.ownerDocument;
		var nodesSnapshot = doc.evaluate(xpath, parentNode, this._nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
		var attr = nodesSnapshot.snapshotItem(0)
		if (attr) return attr.value;
		return null;	
	}
	
	
	getContent(parentNode, xpath)
	{	 
		var doc = (!parentNode.ownerDocument)? parentNode : parentNode.ownerDocument;		
		var nodesSnapshot = doc.evaluate(xpath, parentNode, this._nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		var content = [];
		for (var i=0;i<nodesSnapshot.snapshotLength;i++) content[i] = nodesSnapshot.snapshotItem(i).innerHTML;
		return content;
	}	
	
	
	getAttributeValues(parentNode, xpath)
	{
		var doc = (!parentNode.ownerDocument)? parentNode : parentNode.ownerDocument;
		var nodesSnapshot = doc.evaluate(xpath, parentNode, this._nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
		var values = []
		for (var i=0;i<nodesSnapshot.snapshotLength;i++) values[i] = nodesSnapshot.snapshotItem(i).value
		return values;
	}	
}