class TaxChecker
{	
	constructor(xsd, xml, xmlFileName)
	{		
		this._Xml = xml;
		this._Xsd = xsd;	
		this._XmlFileName = xmlFileName;
		this._XPathHelper = new XPathHelper(this._nsResolver);
		this._XsdHelper = new XsdHelper(this._nsResolver);
		this.log = [];
		this.isFullDescription = false;		
	}	
	
	_log(message)
	{
		this.log[this.log.length] = message;
	}
	
	
	_traverseXml(xsdPath, xmlPath)
	{
		var xsdNode = xsdPath[xsdPath.length-1]; //текущий xsd узел
		var xmlNode = xmlPath[xmlPath.length-1]; //текущий xml узел	
		
		// только для первого проверяем количество одинаковых узлов. Или для отсутсвующего (getNumber == -1). При этом элементы в choice не проверять
		if (this._getNumber(xmlNode) <= 1 && !this._XsdHelper.inChoice(xsdNode)) 
			this._checkCount(xsdPath, xmlPath);
		
		if (!xmlNode || !xsdNode) return;	
		
		this._checkChoice(xsdPath, xmlPath);
		this._checkAttributes(xsdPath, xmlPath);
		this._checkTests(xsdPath, xmlPath);
		
		var childXsdElements = this._XsdHelper.getChildXsdElements(xsdNode);
		//присутствующие в xml узлы (может отсутств. xsd узел)
		Array.from(xmlNode.children).forEach(xml => this._traverseXml(xsdPath.concat(childXsdElements.find(xsd => xml.nodeName == xsd.getAttribute("name"))), xmlPath.concat(xml)));		
		// отсутствующие в xml узлы (но присутств в xsd)
		childXsdElements.filter(xsd => !Array.from(xmlNode.children).some(xml => xml.nodeName == xsd.getAttribute("name"))).forEach(xsd => this._traverseXml(xsdPath.concat(xsd), xmlPath.concat(null)));		
	}	

		
	_checkCount(xsdPath, xmlPath)
	{	
		var xsdNode = xsdPath[xsdPath.length-1];
		var xmlNode = xmlPath[xmlPath.length-1];
		
		if (!xsdNode) 
		{
			var nodeType = (xmlNode.nodeType == 1)? "Элемент" : "Атрибут";
			this._log(nodeType + " <b>" + xmlNode.nodeName + "</b> не предусмотрен XSD схемой");
			return;
		}
		
		var nodeType = (xsdNode.nodeName == "xs:element")? 1 : 2;
		var xmlOccurs = this._getCount(xmlNode);
		var minOccurs = this._XsdHelper.getMinOccurs(xsdNode);
		var maxOccurs = this._XsdHelper.getMaxOccurs(xsdNode);
		
		// Для тегов		
		if (nodeType == 1 && (xmlOccurs > maxOccurs || xmlOccurs < minOccurs))		
		{			
			var mustBe = '';     // Должно быть по количеству
			if (maxOccurs == minOccurs) mustBe = 'в количестве ' + minOccurs
			else if (maxOccurs == Infinity) mustBe =' минимум ' + minOccurs
				else mustBe = ' от ' +  minOccurs + ' до ' + maxOccurs

			var present = (xmlOccurs == 0)? "отсутствует" : "присутствует " + xmlOccurs + " раз";			
			this._log(this._getDescription(xsdPath, xmlPath) + " " + present +  ". Должно быть " + mustBe);
		}		
		// Для атрибутов
		if (nodeType == 2 && !xmlNode && xsdNode.getAttribute("use") == "required")
		{			
			this._log("Не заполнено обязательное поле " +  this._getDescription(xsdPath, xmlPath));
		}
		
		return "";
	}
	
	
	//проверка choice под текущим узлом
	_checkChoice(xsdPath, xmlPath)
	{
		var xsdNode = xsdPath[xsdPath.length-1];
		var xmlNode = xmlPath[xmlPath.length-1];
		
		if (!xsdNode || !xmlNode) return;
		
		var choices = this._XsdHelper.getChoiceXsdElements(xsdNode);
		var childXsdElements = this._XsdHelper.getChildXsdElements(xsdNode);
		
		for (var i=0; i<choices.length; i++)
		{			
			var choiceGroups = Array.from(choices[i].children).map(n => (n.nodeName == "xs:element")? [n] : this._XsdHelper.getChildXsdElements(n));			
			var xsdOccursInXml = choiceGroups.map(g => g.filter(n => childXsdElements.some(c => c == n) && this._XPathHelper.getNodes(xmlNode,n.getAttribute("name")).length>0));
			xsdOccursInXml = xsdOccursInXml.filter(g => g.length>0);
			
			if (xsdOccursInXml.length <= 0)
			{
				var requriedXsd = choiceGroups.map(g => g.filter(xsd => this._XsdHelper.getMinOccurs(xsd)>0)).filter(g => g.length>0);
				var xsdPaths = requriedXsd.map(g => g.map(xsd => xsd));
				var names = requriedXsd.map(g => g.map(xsd => this._getDescription(xsdPath.concat(xsd), xmlPath.concat(null))));
				names = names.map(g => g.join(" и ")).join(" или ");
				if (requriedXsd.length > 0) this._log("Необходимо заполнить обязательные разделы: " + names);
			}
			else if (xsdOccursInXml.length == 1)
			{			
				xsdOccursInXml.forEach(g => g.forEach(xsd => this._checkCount(xsdPath.concat(xsd), xmlPath.concat(this._XPathHelper.getSingleNode(xmlNode, xsd.getAttribute("name"))) )))				
			}
			else if (xsdOccursInXml.length > 1)
			{
				var names = xsdOccursInXml.map(g => g.map(xsd => this._getDescription(xsdPath.concat(xsd), xmlPath.concat(null))));
				names = names.map(g => g.join(" или ")).join(" и ");
				this._log("Обнаружено одновременное заполнение разделов: " + names + ". Должен быть заполнен только один.");
			}
		}		
	}
	
	
	_checkAttributes(xsdPath, xmlPath)
	{
		var xsdNode = xsdPath[xsdPath.length-1];
		var xmlNode = xmlPath[xmlPath.length-1];
		
		if (!xsdNode || !xmlNode) return ;
		
		var xsdAttributes = this._XsdHelper.getXsdAttributes(xsdNode);	
		
		//отсутсвующие в xsd схеме элементы
		Array.from(xmlNode.attributes).filter(xml => !xsdAttributes.some(xsd => xml.nodeName == xsd.getAttribute("name"))).forEach(xml => this._log(xml.nodeName + " отсутствует в XSD схеме"));
		
		for (var i=0; i<xsdAttributes.length; i++)
		{
			var xsdAttr = xsdAttributes[i];
			var xmlAttr = xmlNode.attributes[xsdAttr.getAttribute("name")]
			var newXsdPath = xsdPath.concat(xsdAttr); 
			var newXmlPath = xmlPath.concat(xmlAttr);
			
			if (!xmlAttr && xsdAttr.getAttribute("use") == "required")
				this._log("Не заполнено обязательное поле " + this._getDescription(newXsdPath, newXmlPath));
			
			this._checkSimpleContent(newXsdPath, newXmlPath);
		}			
	}
	
	
	_checkTests(xsdPath, xmlPath)
	{
		var xsdNode = xsdPath[xsdPath.length-1];
		var xmlNode = xmlPath[xmlPath.length-1];
		
		if (!xmlNode || !xsdNode) return; //узла нет в xsd или в xml
		
		var result = {};
		var log = [];
		var xmlDoc = xmlNode.ownerDocument;
		var asserts = this._XPathHelper.getNodes(xsdNode, "xs:annotation/xs:appinfo/sch:pattern/sch:rule/sch:assert");		
		
		for (var i=0; i<asserts.length; i++)
		{
			var test = asserts[i].getAttribute("test");
			
			if (test.startsWith("usch:iif"))
			{			
				var arrTest = test.split(",");
				arrTest[0] = arrTest[0].trim().slice(8).trim().slice(1); // удаляем лишние скобки от iif
				arrTest[2] = arrTest[2].trim().slice(0,-1); //лишние скобки вконце и в начале
				
				result = xmlDoc.evaluate(arrTest[0], xmlNode, null, XPathResult.BOOLEAN_TYPE, null);
				if (result.booleanValue) result = xmlDoc.evaluate(arrTest[1], xmlNode, null, XPathResult.BOOLEAN_TYPE, null)
					else result = xmlDoc.evaluate(arrTest[2], xmlNode, null, XPathResult.BOOLEAN_TYPE, null)
			}
			else if (test.startsWith("usch:getFileName()"))
			{
				if (!this._XmlFileName) continue;
				var arrTest = test.split("=");	
				var lastPointIndex = this._XmlFileName.lastIndexOf(".");
				var fileName = (lastPointIndex == -1)? this._XmlFileName : this._XmlFileName.substr(0,lastPointIndex);
				result.booleanValue = (this._XPathHelper.getSingleAttributeValue(xmlDoc, "Файл/@ИдФайл") == fileName);
			}
			else result = xmlDoc.evaluate(test, xmlNode, null, XPathResult.BOOLEAN_TYPE, null);

			if (!result.booleanValue)
				this._log(this._getDescription(xsdPath, xmlPath) + ". " + this._XPathHelper.getContent(asserts[i], "usch:error"));
		}
		
		return log;
	}
	
	
	_checkSimpleContent(xsdPath, xmlPath)
	{
		var xsdNode = xsdPath[xsdPath.length-1];
		var xmlNode = xmlPath[xmlPath.length-1];
		
		if (!xmlNode || !xsdNode) return; //узла нет в xsd или в xml
		
		var typeName = xsdNode.getAttribute("type");
		var xmlValue = xmlNode.textContent;
		
		var restriction = null;
		
		// Если есть ссылка глобальный тип
		if (typeName) 
			restriction = this._XPathHelper.getSingleNode(xsdNode.ownerDocument, 'xs:schema/xs:simpleType[@name="' + typeName + '"]/xs:restriction')		
		else 	
			restriction = this._XPathHelper.getSingleNode(xsdNode, 'xs:simpleType/xs:restriction'); // Нет ссылки на глобальный тип	
		
			
		//Строки для объяснения ограничений		
		var checkResult = true;	
		var baseText = "";
		var restrictionText = ""
		
		var baseType = typeName;
		if (restriction) baseType = restriction.getAttribute("base");
		
		
		// Проверка базового типа
			switch (baseType)
			{
				case 'xs:string': //не проверяем, т.к. тип и так всегда изначально string
					baseText = 'строкой'
					break

				case 'xs:integer':
					if (!this._checkInt(xmlValue)) checkResult = false
					baseText = 'целым числом'
					break

				case 'xs:decimal':
					if (!this._checkDecimal(xmlValue)) checkResult = false
					baseText = 'дробным числом  (дробная часть отделяется точкой)'
					break

				case 'xs:gYear':
					if (!this._checkYear(xmlValue)) checkResult = false
					baseText = 'тремя цифрами. Например: 2014'
					break
			}
			//Проверка специфических ограничений (restriction).
		
			if (restriction)
			{			
				var length = this._XPathHelper.getSingleAttributeValue(restriction, "xs:length/@value");
				var minLength = this._XPathHelper.getSingleAttributeValue(restriction, "xs:minLength/@value");
				var maxLength = this._XPathHelper.getSingleAttributeValue(restriction, "xs:maxLength/@value");
				var totalDigits = this._XPathHelper.getSingleAttributeValue(restriction, "xs:totalDigits/@value");
				var fractionDigits = this._XPathHelper.getSingleAttributeValue(restriction, "xs:fractionDigits/@value");
				var patterns = this._XPathHelper.getAttributeValues(restriction, "xs:pattern/@value");
				var enumerations = this._XPathHelper.getAttributeValues(restriction, "xs:enumeration/@value");
				
				if (length)
					if (xmlValue.length != length)
					{
						checkResult = false
						restrictionText = 'должно быть длиной ' + length + ' cимволов'
					}
				if (minLength && maxLength)
					if (xmlValue.length > maxLength || xmlValue.length < minLength)
					{
						checkResult = false
						restrictionText = 'должно быть длиной от ' + minLength + ' до ' + maxLength + ' символов'
					}
				if (maxLength && !minLength)
					if (xmlValue.length > maxLength)
					{
						checkResult = false
						restrictionText = 'должно быть длиной до ' + maxLength + ' символов'
					}
				if (!maxLength && minLength)
					if (xmlValue.length < minLength)
					{
						checkResult = false
						restrictionText = 'должно быть длиной от ' + minLength + ' символов'
					}
				if (totalDigits)
					if (xmlValue.length > parseInt(totalDigits) + 1)
					{
						checkResult = false
						restrictionText = 'должно быть общей длиной до ' + totalDigits + ' цифр '
					}
				if (fractionDigits)
				{
					var fraction = xmlValue.split('.')[1];			
					if (fraction) 					
						if (fraction.length > fractionDigits)				
						{
							checkResult = false
							restrictionText += ', c числом цифр в дробной части равным ' + fractionDigits + ' символов'
						}
				}
				if (patterns.length > 0)
				{
					var isOk = false;
					for (var i = 0; i < patterns.length; i++)
					{
						var r = new RegExp(patterns[i])
						if (r.test(xmlValue)) {isOk = true; break;} 	//Если соответствует хоть одному паттерну
					}
					if (!isOk)
					{
						checkResult = false;
						restrictionText = 'по определенному шаблону';
					}
				}
				if (enumerations.length > 0)
				{
					var isOk = false;
					var list = '';
					for (var i = 0; i<enumerations.length; i++)
					{
						if (xmlValue == enumerations[i]) isOk = true;
						list += ' ' + enumerations[i]	+ ',';
					}
					if (!isOk)
					{
						checkResult = false;
						list = list.slice(0,-1);
						restrictionText = 'Должно быть из списка значений:' + list;
						baseText = ''; // информацию о базовом типе не будем выводить, т.к. и так есть список значений
					}
				}

			}
			
		if (checkResult) return;
		
		var required = "";
		if (xmlNode.nodeType == 1) 
		{
			required = (this._XsdHelper.getMinOccurs(xmlNode) > 0) ? "обязательное" : "необязательное"			
		}
		else if (xmlNode.nodeType == 2) 
		{
			required = (xsdNode.getAttribute("use") == "required") ? "обязательное" : "необязательное";		
		}
		this._log(this._getDescription(xsdPath, xmlPath) + " = \"" + xmlValue +"\". Неверно заполнено " + required + " поле. Должно быть " + baseText + " " + restrictionText);
	}
	
	
	_checkInt(value)
	{
		if (value == null) return false
		value = value / 1
		return parseInt(value) === value
	}


	_checkYear(value)
	{
		if (value == null) return false
		if (value.length != 4) return false
		var r = new RegExp('[0-9]{4}')
		if (r.test(value)) return true
		else return false
	}


	_checkDecimal(value)
	{
		if (value == null) return false
		var p = 0
		for (var i = 0; i < value.length; i++)
		{
			if (value[i] == '.') p++
			if (!( value[i]/1 === parseInt(value[i])) && value[i] != '.') return false
		}

		if (p > 1) return false //если точек больше одной
		return true
	}
	

	
	
	
		
	// количество узлов с одним и тем же именем на том же уровне с одним и тем же родителем
	_getCount(xmlElement)
	{			
		if (!xmlElement) return 0; //нет узла в xml вообще		
		var parent = xmlElement.parentElement || xmlElement.parentNode;
		return this._XPathHelper.getNodes(parent, xmlElement.nodeName).length;
	}
	
	
	// номер тега среди одноименных узлов на том же уровне с одним и тем же родителем
	_getNumber(xmlNode)
	{
		var num = -1; // значение по умолчанию, если ничего не нашлось
		if (!xmlNode) return -1; // для отсутствующего узла полагаем номер -1	
		if (xmlNode.nodeType == 2) return 1; //для атрибутов выводим номер 1 всегда
		var parent = xmlNode.parentElement || xmlNode.parentNode;		
		if (!parent) return -1; // родителя не нашлось		
		var num = Array.from(parent.children).filter(xml => xml.nodeName == xmlNode.nodeName).indexOf(xmlNode);			
		return num+1;			
	}

	
	
	
	_getDescription(xsdPath, xmlPath)
	{
		if (this.isFullDescription) return this._fullDescription(xsdPath, xmlPath)		
		return this._shortDescription(xsdPath, xmlPath);
	}
	
	
	_shortDescription(xsdPath, xmlPath)
	{	
		var description = [];	
		if (!xsdPath[xsdPath.length-1]) return ""; // узла нет в схеме
		
		for (var i= xsdPath.length-1; i>=0; i--)
		{
			var num = this._getNumber(xmlPath[i]);			
			var documentation = this._XsdHelper.getDocumentation(xsdPath[i]);
			var text = "";
			if (i == xsdPath.length-1) text = documentation[0] || documentation[1] || xsdPath[i].getAttribute("name"); // на первой итерации выводить любое название
				else text = (documentation[0])? documentation[0] : "";
			if (text)
			{
				text += (num > 1)? "(" + num + ")" : "";
				description[description.length] = text;	
			}
			if (this._XsdHelper.isPart(xsdPath[i])) break;
		}
		
		if (description.length > 0) return "<b>" + description.reverse().join(" &rArr; ") + "</b>";
		return "";
	}
	
	
	_fullDescription(xsdPath, xmlPath)
	{
		var description = [];	
		if (!xsdPath[xsdPath.length-1]) return ""; // узла нет в схеме
		
		for (var i= xsdPath.length-1; i>=0; i--)
		{	
			var num = this._getNumber(xmlPath[i]);			
			var documentation = this._XsdHelper.getDocumentation(xsdPath[i]);	
			var nodeName = xsdPath[i].getAttribute("name");
			description[description.length] = (documentation[0] || documentation[1] || nodeName) + "(" + num + ") " + nodeName + "[" + num +"]";			
		}
		
		if (description.length > 0) return "<b>" + description.reverse().join(" &rArr; ") + "</b>";
		return "";		
	}
	
	
	
	_nsResolver(nsPrefix)
	{
		if (nsPrefix == 'xs') return 'http://www.w3.org/2001/XMLSchema'
		else if (nsPrefix == 'sch') return 'http://purl.oclc.org/dsdl/schematron'
		else if (nsPrefix == 'usch') return 'http://www.unisoftware.ru/schematron-extensions';
		return null;
	}
	
		
	Validate()
	{			
		var xsdNode = this._XPathHelper.getSingleNode(this._Xsd, "xs:schema/xs:element");	
		var xmlNode = this._XPathHelper.getSingleNode(this._Xml, xsdNode.getAttribute("name"));	
		this._traverseXml([xsdNode], [xmlNode]);
	}
	
	
	
}
