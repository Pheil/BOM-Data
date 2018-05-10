var myWindowId;
var currentURL;
var root_Part;
var theBOM = [];
var theTitles = [];
var theTitles2 = [];

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
        //Clear sidepanel
        if (document.contains(document.getElementById("container"))) {
            document.getElementById("container").remove();
        }
        //Show notice
        document.getElementById("notice").style.display = 'block';
    } else if (currentURL != url) {
        currentURL = tabs[0].url.toUpperCase();
        //Hide notice
        document.getElementById("notice").style.display = 'none';
        //Clear old results
        if (document.contains(document.getElementById("CustomerPN"))) {
            document.getElementById("CustomerPN").remove();
            document.getElementById("Customer").remove();
        }
        if (document.contains(document.getElementById("BOMName"))) {
            document.getElementById("BOMName").remove();
            document.getElementById("BOMValue").remove();
        }
        
        getBaseData(url);
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
                //addEngChanges(part_ID);
                //addSpecs(part_ID);
                //addUsedOn(part_ID);
            } else {
                document.getElementById("notice").style.display = 'block';
                document.getElementById("notice").textContent = "Part ID not accessible, additional information cannot be pulled.";
            }
                
            //Add data to panel
            document.getElementById("desc").textContent = desc;
            document.getElementById("GTC").textContent = GTC;
            document.getElementById("plant").textContent = plant;
            document.getElementById("status").textContent = lifeCycle;
            document.getElementById("export").textContent = exportCont;
        }
    }
}

//Pull BOM
function addBOM(ID) {
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
        divb.id = "BOMName";
        divb.textContent = theTitles[j];
        main.appendChild(divb);
        
        var div = document.createElement("div");
        div.id = "BOMValue";
        //div.setAttribute("name", theBOM[j]);
        var a = document.createElement("a");
        //a.target = "_parent";
        //a.title = theTitles[j];
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
            div1.textContent = theTitles[j];
            main.appendChild(div1);
        
            var div2 = document.createElement("div");
            //div2.setAttribute("name", start + "0");
            var a2 = document.createElement("a");
            //a2.target = "_parent";
            //a2.title = theTitles[j];
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
            item1.setAttribute("id", "null");
            item1.setAttribute("class", "box3");
            item1.textContent = "Customer part numbers not available.";
            div.appendChild(item1);
        } else {
            for (var row=1; row<container.rows.length;row++) {
                var Customer = items[row].getElementsByTagName('td')[4].textContent;
                var CustomerPN = items[row].getElementsByTagName('td')[3].textContent;
                var itemA = document.createElement("div");
                itemA.setAttribute("id", "Customer");
                itemA.setAttribute("class", "box3");
                itemA.textContent = Customer;
                var itemB = document.createElement("div");
                itemB.setAttribute("id", "CustomerPN");
                itemB.setAttribute("class", "box3");
                itemB.textContent = CustomerPN;
                //current.title = current.title + "\n" + Customer + ":  " + CustomerPN;
                div.appendChild(itemA);
                div.appendChild(itemB);
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