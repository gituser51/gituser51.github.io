class XmlNodeEx
{	
	constructor(xsdNode, xmlNode, parentXmlNodeEx)
	{
		this._xsdNode = xsdNode;
		this._xmlNode = xmlNode;
		this._parent = parentXmlNodeEx;
		this.isFullDescription = false;
	}
	
	
	get nodeType()
	{
		if (this._xmlNode) 
			return this._xmlNode.nodeType
		if (this._xsdNode)
		{
			if (this._xsdNode.nodeName == "xs:element") return 1;
			if (this._xsdNode.nodeName == "xs:attribute") return 2;
		}
		
		return null;
	}
	
	
	get nodeName()
	{
		if (this._xmlNode)
			return this._xmlNode.nodeName;
				else if (this._xsdNode)
					return this._xsdNode.getAttribute("name");	
		
		return null;		
	}
	


	
	//все атрибуты, которые присутствуют в исходном xml (в т.ч. которые не предусмотрены xsd схемой) плюс атрибуты, предусмотренные xsd схемой, но отсутствующие в xml
	//при применении к узлу, которого нет в xsd или xml возвращает []
	get attributes()
	{		
	//	if (!this._xmlNode || !this._xsdNode) return []; //узла нет в xsd или в xml
		
		var xmlNodeExArray = [];
		var xsdAttributes = this._getXsdAttributes();		
		
		//присутствующие в xml атрибуты (может отсутств. xsd узел)
		for (var i=0; i < this._xmlNode.attributes.length; i++)
		{
			var xmlNode = this._xmlNode.attributes[i];
			var xsdNode = xsdAttributes.filter(xsd => xsd.getAttribute("name") == xmlNode.nodeName)[0];					
			xmlNodeExArray.push(new XmlNodeEx(xsdNode, xmlNode, this));
		}		
		// отсутствующие в xml атрибуты (но присутств. в xsd)
		for (var i=0; i < xsdAttributes.length; i++)
		{
			var xsdNode = xsdAttributes[i];
			var xmlNode = Array.from(this._xmlNode.attributes).filter(xml => xsdNode.getAttribute("name") == xml.nodeName)[0];
			if (xmlNode) continue;			
			xmlNodeExArray.push(new XmlNodeEx(xsdNode, xmlNode, this));
		}
		
		return xmlNodeExArray;
	}	



	
	
	
	

	
	
	
	
	

		
	
	
		
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
