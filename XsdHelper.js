class XsdHelper
{
	constructor(_nsResolver)
	{
		this._XPathHelper = new XPathHelper(_nsResolver);
	}
	
	getChildXsdElements(xsdNode)
	{	
		var result = [];
		for (var i=0; i<xsdNode.children.length; i++)		
			if (xsdNode.children[i].nodeName == 'xs:element') 
				result.push(xsdNode.children[i])		
				else result = result.concat(this.getChildXsdElements(xsdNode.children[i]));	
				
		//Если есть глобальный тип, то заходим в него
		var typeName = xsdNode.getAttribute('type');
		if (typeName)
		{
			var typeNode = this._XPathHelper.getSingleNode(xsdNode.ownerDocument, 'xs:schema/*[@name="' + typeName + '"]');
			if (typeNode) result = result.concat(this.getChildXsdElements(typeNode));
		}	
		
		return result;
	}



	getChoiceXsdElements(xsdNode)
	{
		var result = [];
		for (var i=0; i<xsdNode.children.length; i++)		
			if (xsdNode.children[i].nodeName == 'xs:choice') 
				result.push(xsdNode.children[i])
				else if (xsdNode.children[i].nodeName == 'xs:element') continue;
					else result = result.concat(this.getChoiceXsdElements(xsdNode.children[i]));			
		
		//Если есть глобальный тип, то заходим в него
		var typeName = xsdNode.getAttribute('type');
		if (typeName)
		{
			var typeNode = this._XPathHelper.getSingleNode(xsdNode.ownerDocument, 'xs:schema/*[@name="' + typeName + '"]');
			if (typeNode) result = result.concat(this.getChoiceXsdElements(typeNode));
		}	
		
		return result;
	}
	
	
	getXsdAttributes(xsdElement)
	{
		var attributes = [];
		var typeName = xsdElement.getAttribute("type");
		if (typeName)
			attributes = this._XPathHelper.getNodes(xsdElement.ownerDocument, 'xs:schema/xs:complexType[@name="' + typeName + '"]/xs:attribute');
				else 
					attributes = this._XPathHelper.getNodes(xsdElement, "xs:complexType/xs:attribute");
		return attributes;		
	}
	
	
	getMinOccurs(xsdElement)
	{			
		var minOccurs = xsdElement.getAttribute('minOccurs');
		if (!minOccurs) minOccurs = 1
			else minOccurs = parseInt(minOccurs);
		return minOccurs;
	}
	
	
	getMaxOccurs(xsdElement)
	{		
		var maxOccurs = xsdElement.getAttribute('maxOccurs');
		if (maxOccurs == 'unbounded') maxOccurs = Infinity
			else if (!maxOccurs) maxOccurs = 1
					else maxOccurs = parseInt(maxOccurs);
		return maxOccurs;
	}
	
		
	getDocumentation(xsdNode)
	{		
		return this._XPathHelper.getContent(xsdNode, 'xs:annotation/xs:documentation');		
	}
	
	
	isPart(xsdElement)
	{			
		return (this._XPathHelper.getContent(xsdElement, 'xs:annotation/xs:documentation')[2] == "part");
	}
	
	
	//текущий узел xsd участвует в choice?
	inChoice(xsdElement)
	{		
		if (!xsdElement) return false; 		
		var choices = this._XPathHelper.getNodes(xsdElement.ownerDocument, "//xs:choice");
		for (var i=0; i<choices.length; i++)	
		if (this.getChildXsdElements(choices[i]).some(n => n == xsdElement)) 
			return true;		
		return false;
	}

	
	find(findName, xsdPath)
	{
		var result = [];
		var xsdNode = xsdPath[xsdPath.length-1];		
		
		if (xsdNode.getAttribute("name").toLowerCase().indexOf(findName.toLowerCase()) != -1)
			result.push(xsdPath); 
		
		this.getXsdAttributes(xsdNode).forEach(attr => result = result.concat(this.find(findName, xsdPath.concat(attr))));
		this.getChildXsdElements(xsdNode).forEach(child => result = result.concat(this.find(findName, xsdPath.concat(child))));
		
		return result;
	}
}
