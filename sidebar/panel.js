var theme;
// Set the element style when the sidebar loads
async function setInitialStyle() {
  theme = await browser.theme.getCurrent();
  setPopUpStyle(theme);
}
setInitialStyle();

var myWindowId;
var currentURL;
var root_Part;

/*
Update the sidebar's content.
1) Get the active tab in this sidebar's window.
2) Get its url.
3) Fetch BOM data for matching part.
*/
function updateContent() {    
    var querying = browser.tabs.query({windowId: myWindowId, active: true});
    querying.then(checkURL, onError);
}

function checkURL(tabs) {
    const url = tabs[0].url.toUpperCase();
    //Check if it is a valid part PDF
    if (url.indexOf(".PDF") < 1) {
        clearOLD();  
        //Show notice
        var theNotice = document.getElementById("notice");
        theNotice.style.display = 'block';
        theNotice.classList.add("empty");
        theNotice.textContent = "Open a drawing to view data.";
        
        
        
    } else if (currentURL != url) {
        currentURL = tabs[0].url.toUpperCase();
        //Hide notice
        document.getElementById("notice").style.display = 'none';
        clearOLD();        
        
        getBaseData(url);
    }
}

function clearOLD() {
    document.getElementById("desc").textContent = "-";
    document.getElementById("GTC").textContent = "-";
    document.getElementById("plant").textContent = "-";
    document.getElementById("status").textContent = "-";
    document.getElementById("export").textContent = "-";
        
    if (document.contains(document.getElementById("Customer"))) {
        var x = document.querySelectorAll("#CustomerPN");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].remove();
        }
        var y = document.querySelectorAll("#Customer");
        var i;
        for (i = 0; i < y.length; i++) {
            y[i].remove();
        }
    }
    if (document.contains(document.getElementById("BOMName"))) {
        var x = document.querySelectorAll("#BOMName");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].remove();
        }
        var y = document.querySelectorAll("#BOMValue");
        var i;
        for (i = 0; i < y.length; i++) {
            y[i].remove();
        }
    }
    if (document.contains(document.getElementById("ECE"))) {
        var x = document.querySelectorAll("#ECE");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].remove();
        }
        var y = document.querySelectorAll("#ECEnum");
        var i;
        for (i = 0; i < y.length; i++) {
            y[i].remove();
        }
    }
    if (document.contains(document.getElementById("UsedNum"))) {
        var x = document.querySelectorAll("#UsedNum");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].remove();
        }
    }
    if (document.contains(document.getElementById("SpecNum"))) {
        var x = document.querySelectorAll("#SpecNum");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].remove();
        }
    }
    
}

function emptyID() {
    document.getElementById("desc").textContent = "N/A";
    document.getElementById("GTC").textContent = "-";
    document.getElementById("plant").textContent = "-";
    document.getElementById("status").textContent = "-";
    document.getElementById("export").textContent = "-";
}

function emptyBOM(theBOM) {
    //var main = document.getElementById("container");
    //var li = document.createElement("li");
    //li.setAttribute("class", "empty");
    //var a = document.createElement("a");
    //a.textContent = "No components are listed in Oracle for this part.";
    //li.appendChild(a);
    //main.appendChild(li);
}

function gup( name, url ) {
    // Return value for a requested variable in a URL
    if (!url) url = location.href;
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)",
        regex = new RegExp( regexS ),
        results = regex.exec( url );
    return results === null ? null : results[1];
}

/* 
    getBaseData() - Part Plant Query Results
    - Part ID - part_ID
    - Part Description - desc
    - Plant - plant
    - GTC - GTC
    - Life Cycle Code - lifeCycle
    - Export Control - exportCont
*/
function getBaseData(taburl) {
    root_Part = taburl.match(/([^\/]+)(?=\.\w+$)/)[0];

    var xmlhttp = new XMLHttpRequest(),
        url = "http://pafoap01:8888/pls/prod/ece_webquery.part_plant_results?p_part=" + root_Part + "&p_desc=&p_code=&p_plant=All&p_lifecycle_status=All&p_sort_by=pn.ta_part_no";

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var resp = this.response;
            saveBaseData(resp);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.responseType = "document";
    xmlhttp.send();

    function saveBaseData(resp) {
        var table = resp.getElementsByTagName('table')[1],
        tr = table.getElementsByTagName("tr");
        if (tr.length == 1) {
            emptyID();
        } else {
            var d = table.getElementsByTagName("tr")[1];
            var r = d.getElementsByTagName("td")[0],
                desc = d.getElementsByTagName("td")[1].textContent,
                plant = d.getElementsByTagName("td")[2].textContent,
                GTC = d.getElementsByTagName("td")[3].textContent,
                lifeCycle = d.getElementsByTagName("td")[4].textContent,
                exportCont = d.getElementsByTagName("td")[5].textContent;
            if (r.childNodes[0].href){
                var part_ID = gup('p_part_id', r.childNodes[0].href);            

                addBOM(part_ID);
                addXref(part_ID);
                addEngChanges(part_ID);
                addSpecs(part_ID);
                addUsedOn(part_ID);
            } else {
                var theNotice = document.getElementById("notice");
                theNotice.style.display = 'block';
                theNotice.classList.remove("empty");
                theNotice.textContent = "Part ID not accessible, additional information cannot be pulled.";
            }
                
            //Add data to panel
            document.getElementById("desc").textContent = desc;
            document.getElementById("GTC").textContent = GTC;
            if (plant.length == 1 ) {
                document.getElementById("plant").textContent = "-";
            } else {
                document.getElementById("plant").textContent = plant;
            }
            document.getElementById("status").textContent = lifeCycle;
            document.getElementById("export").textContent = exportCont;
        }
    }
}

//Pull BOM
function addBOM(ID) {

    var theBOM = [];
    var theTitles = [];
    var theTitles2 = [];

    var xmlhttp2 = new XMLHttpRequest(),
        url2 = "http://pafoap01:8888/pls/prod/ece_webquery.bom_results?p_part_number=" + ID + "&p_view=BOM";

    xmlhttp2.onreadystatechange = function() {
        if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
            var resp = this.response;
            myFunction2(resp);
        }
    };
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.responseType = "document";
    xmlhttp2.send();
    
    function del_column(col_no,container) {
        for (var row=0; row<container.rows.length;row++) {
            container.rows[row].deleteCell(col_no); 
        }
    }

    function myFunction2(resp) {
        var container = resp.getElementsByTagName('table')[1],
        items = container.getElementsByTagName('a');
        if (items.length === 0) {  
            emptyBOM();
        } else {
            container.deleteRow(2);
            container.deleteRow(1);
            container.deleteRow(0);
            //Delete columns not needed
            for (var m = 8; m >= 3; m--) {
                del_column(m,container);
            }
            del_column(0,container);
            
            var titles = container.getElementsByTagName('td');

            //Clean up array by removing part numbers (ever other item)
            for (var i = 1; i <= titles.length; i += 2)
                theTitles2.push(titles[i]);
            if (items.length === 0) {
                emptyBOM();
            } else {
                for (var j = 0; j < items.length; j++) {
                    if (items[j].href.indexOf("/pls/prod/ece_webquery.bom_results?p_part_number") > -1) {
                        theBOM.push(items[j].textContent);                    
                    }
                }
                for (var k = 0; k < theTitles2.length; k++) {
                    if (theTitles2[k].textContent) {
                        theTitles.push(theTitles2[k].textContent);
                    }
                }
                updateBOM(theBOM,theTitles);
            }
        }
    }
}

//Pull HREF for each component & add to bar
function updateBOM(theBOM,theTitles) {
    var main = document.getElementById("BOM");
    for (var j = 0; j < theBOM.length; j++) {
        var divb = document.createElement("div");
        divb.setAttribute("id", "BOMName");
        divb.textContent = theTitles[j];
        main.appendChild(divb);
        
        var div = document.createElement("div");
        div.setAttribute("id", "BOMValue");
        var a = document.createElement("a");
        a.href = FSdisplay(theBOM[j]);
        a.textContent = theBOM[j];
        a.target = "_new";
        div.appendChild(a);
        main.appendChild(div);
        
        // If last character is not a zero add extra link to it
        var start = theBOM[j].slice(0, -1);
        var last = theBOM[j].slice(-1);
        if (last != "0") {
            var div1 = document.createElement("div");
            div1.setAttribute("id", "BOMName");
            div1.innerHTML = theTitles[j] + "<span title='Automatic dash 0 addition.'> *</span>";
            main.appendChild(div1);
        
            var div2 = document.createElement("div");
            div2.setAttribute("id", "BOMValue");
            var a2 = document.createElement("a");
            a2.href = FSdisplay(start + "0");
            a2.textContent = theBOM[j].slice(0, -1) + "0";
            a2.target = "_new";
            div2.appendChild(a2);
            main.appendChild(div2);
        }
    }
}
    
//Pull Xref
function addXref(ID) {
    var xmlhttp2 = new XMLHttpRequest(),
        url2 = "http://pafoap01:8888/pls/prod/ece_webquery.customer_cross_ref_results?p_part_number=" + ID + "&p_customer_part_number=All&p_customer=All";

    xmlhttp2.onreadystatechange = function() {
        if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
            var resp = this.response;
            getData(resp);
        }
    };
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.responseType = "document";
    xmlhttp2.send();
    
    function getData(resp) {
        var div = document.getElementById("Xref");
        var container = resp.getElementsByTagName('table')[1],
        items = container.getElementsByTagName('tr');
        if (items.length === 1) {
            var item1 = document.createElement("div");
            item1.setAttribute("id", "Customer");
            item1.setAttribute("class", "nullBase null");
            item1.textContent = "None available.";
            div.appendChild(item1);
            if (theme.colors && (theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field)) {
                item1.style.backgroundColor = theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field + " ! important";
            }
            if (theme.colors && theme.colors.toolbar_field_text) {
                item1.style.color = theme.colors.toolbar_field_text;
            }
        } else {
            for (var row=1; row<container.rows.length;row++) {
                var Customer = items[row].getElementsByTagName('td')[4].textContent;
                var CustomerPN = items[row].getElementsByTagName('td')[3].textContent;
                var itemA = document.createElement("div");
                itemA.setAttribute("id", "Customer");
                itemA.textContent = Customer;
                var itemB = document.createElement("div");
                itemB.setAttribute("id", "CustomerPN");
                itemB.textContent = CustomerPN;
                div.appendChild(itemA);
                div.appendChild(itemB);
            }
        }
    }
}

function addEngChanges(ID) {
    var xmlhttp2 = new XMLHttpRequest(),
        url2 = "http://pafoap01:8888/pls/prod/ece_webquery.part_no_ece?p_part_id=" + ID;

    xmlhttp2.onreadystatechange = function() {
        if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
            var resp = this.response;
            getData(resp);
        }
    };
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.responseType = "document";
    xmlhttp2.send();
    
    function getData(resp) {
        var div = document.getElementById("ECEDiv");
        var container = resp.getElementsByTagName('table')[0],
        items = container.getElementsByTagName('tr');
        if (items.length === 1) {
            var item1 = document.createElement("div");
            item1.setAttribute("id", "ECE");
            item1.setAttribute("class", "nullBase null");
            item1.textContent = "No listed costs.";
            div.appendChild(item1);
            if (theme.colors && (theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field)) {
                item1.style.backgroundColor = theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field + " ! important";
            }
            if (theme.colors && theme.colors.toolbar_field_text) {
                item1.style.color = theme.colors.toolbar_field_text;
            }
        } else {
            for (var row=1; row<container.rows.length;row++) {
                var ECEnum = items[row].getElementsByTagName('td')[1].textContent;
                var itemA = document.createElement("div");
                itemA.setAttribute("id", "ECE");
                itemA.setAttribute("class", "cost");
                itemA.textContent = "Cost - " + ECEnum;
                div.appendChild(itemA);              
            }            
        }
    }
}

function addUsedOn(ID) {
    var xmlhttp2 = new XMLHttpRequest(),
        url2 = "http://pafoap01:8888/pls/prod/ece_webquery.bom_results?p_part_number=" + ID + "&p_view=USEDON";

    xmlhttp2.onreadystatechange = function() {
        if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
            var resp = this.response;
            getData(resp);
        }
    };
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.responseType = "document";
    xmlhttp2.send();
    
    function getData(resp) {
        var div = document.getElementById("UsedOn");
        var container = resp.getElementsByTagName('table')[1],
        items = container.getElementsByTagName('tr');
        if (items.length === 1) {
            var item1 = document.createElement("div");
            item1.setAttribute("id", "UsedNum");
            item1.setAttribute("class", "nullBase null");
            item1.textContent = "N/A";
            div.appendChild(item1);
        } else {
            var UsedNum_p;
            for (var row=1; row<container.rows.length;row++) {
                var UsedNum = items[row].getElementsByTagName('td')[0].textContent;
                if (UsedNum != UsedNum_p) {
                    var UsedDesc = items[row].getElementsByTagName('td')[1].textContent;
                    var itemA = document.createElement("div");
                    itemA.setAttribute("id", "UsedNum");
                    itemA.setAttribute("title", UsedDesc);
                    var link = FSdisplay(UsedNum);
                    if (link != "unknown") {
                        var a2 = document.createElement("a");
                        a2.href = link;
                        a2.textContent = UsedNum;
                        a2.target = "_new";
                        itemA.appendChild(a2);
                    } else {
                        itemA.textContent = UsedNum;
                    }
                    div.appendChild(itemA);
                    
                    UsedNum_p = items[row].getElementsByTagName('td')[0].textContent;
                }              
            }            
        } 
    }
}

function addSpecs(ID) {
    var xmlhttp2 = new XMLHttpRequest(),
        url2 = "http://pafoap01:8888/pls/prod/ece_webquery.part_no_specifications?p_part_id=" + ID;

    xmlhttp2.onreadystatechange = function() {
        if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
            var resp = this.response;
            getData(resp);
        }
    };
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.responseType = "document";
    xmlhttp2.send();
    
    function getData(resp) {
        var div = document.getElementById("Specs");
        var container = resp.getElementsByTagName('table')[0],
        items = container.getElementsByTagName('tr');
        if (items.length === 1) {
            var item1 = document.createElement("div");
            item1.setAttribute("id", "SpecNum");
            item1.setAttribute("class", "nullBase nullSpec");
            item1.textContent = "None available.";
            div.appendChild(item1);
            if (theme.colors && (theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field)) {
                item1.style.backgroundColor = theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field + " ! important";
            }
            if (theme.colors && theme.colors.toolbar_field_text) {
                item1.style.color = theme.colors.toolbar_field_text;
            }
        } else {
            for (var row=1; row<container.rows.length;row++) {
                var SpecNum = items[row].getElementsByTagName('td')[0].textContent;

                var itemA = document.createElement("div");
                itemA.setAttribute("id", "SpecNum");
                var link = FSdisplay(SpecNum);
                if (link != "unknown") {
                    var a2 = document.createElement("a");
                    a2.href = link;
                    a2.textContent = SpecNum;
                    a2.target = "_new";
                    itemA.appendChild(a2);
                } else {
                    itemA.textContent = SpecNum;
                }
                div.appendChild(itemA);           
            }            
        } 
    }
}

function onError(error) {
    console.log(`Error: ${error}`);
}

/*
Update content when a new tab becomes active.
*/
browser.tabs.onActivated.addListener(updateContent);

/*
Update content when a new page is loaded into a tab.
*/
browser.tabs.onUpdated.addListener(updateContent);

/*
When the sidebar loads, get the ID of its window,
and update its content.
*/
browser.windows.getCurrent({populate: true}).then((windowInfo) => {
  myWindowId = windowInfo.id;
  updateContent();
});

// Theme matching
function setPopUpStyle(theme) {

  // Overall Background
    if (theme.colors && (theme.colors.tab_selected || theme.colors.toolbar)) {
        document.body.style.backgroundColor = theme.colors.tab_selected || theme.colors.toolbar;
        if (theme.colors && theme.colors.toolbar_field_text) {
            document.body.style.color = theme.colors.toolbar_field_text;
        }
        if (theme.colors && (theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field)) {
            document.getElementById("notice").style.backgroundColor = theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field;
        }
    } else if (theme.colors && (theme.colors.accentcolor || theme.colors.popup)) {
        document.body.style.backgroundColor = theme.colors.accentcolor || theme.colors.popup;
        if (theme.colors && theme.colors.toolbar_field_text) {
            document.body.style.color = theme.colors.toolbar_field_text;
        }
        if (theme.colors && (theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field)) {
            document.getElementById("notice").style.backgroundColor = theme.colors.toolbar_field_border || theme.colors.toolbar_field_border_focus || theme.colors.toolbar_field;
        }
    }
  
  // Base
  
  // Titles (2x)
  
  // Titles (1x)
  
  // Boxes

  
}