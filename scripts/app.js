const API_URL = "https://newsapi.org/v2";
const API_KEY = "eb81469a009444e4818bb6c71c38d37d";
const DB_NAME = "feedly-pwa";
const DB_STORES = [{ name: 'headlines', options: { keyPath: 'id', autoIncrement: true } }, { name: 'sources', options: { keyPath: 'id' } }];


(function() {
    "use strict";

    window.onload = function() {
        __init();
    };


    function __init() {
        initDB();
        renderFilters();
        renderHeadlines();
        applyEventListeners();
        window._app = {};
        window._app.reload = reload;
    }

    function reload(){
          renderHeadlines();
          $('#source_filter').val('');
          $('#country_filter').val('');
          $('select').material_select();
    }

    function initDB() {
        if (!window.indexedDB) {
            window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        } else {
            openDatabase(DB_NAME);
        }

    }

    function openDatabase(db_name) {
        window.dbPromise = idb.open(DB_NAME, 1, function(db) {
            DB_STORES.map((store) => {
                if (!db.objectStoreNames.contains(store.name)) {
                    db.createObjectStore(store.name, store.options);
                    console.log(`created store ${store.name} `);
                }
            });
        });
    }

    function dbSave(objectStore, data) {
        return window.dbPromise.then(function(db) {
            var tx = db.transaction(objectStore, 'readwrite');
            var store = tx.objectStore(objectStore);
            data.forEach(function(item) {
                store.add(item);
            })
            return tx.complete;
        })
    }

    function dbClear(objectStore) {
        return window.dbPromise.then(function(db) {
            var tx = db.transaction(objectStore, 'readwrite');
            var store = tx.objectStore(objectStore);
            store.clear();
            return tx.complete;
        })
    }

    /**
     * Get an item from an object store using its primary key / index
     * @param {string} objectStore 
     * @param {string} id 
     * 
     * @returns {Promise} Returns a promise 
     */
    function dbGet(objectStore, id) {
        return window.dbPromise.then(function(db) {
            var tx = db.transaction(objectStore, 'readonly');
            var store = tx.objectStore(objectStore);
            return store.get(id);
        })
    }

    /**
     * 
     * @param {string} objectStore 
     * @param {string} cb 
     * 
     * @returns {Promise} returns a promise 
     */
    function dbGetAll(objectStore) {
        return window.dbPromise.then(function(db) {
            var tx = db.transaction(objectStore, 'readonly');
            var store = tx.objectStore(objectStore);
            return store.getAll();
        })
    }



    function renderFilters() {
        renderCountryFilter();
        renderSourceFilter();
    }

    function renderHeadlines() {
        fetchRecentHeadlines()
            .then(articles => {
                if(articles.length > 0)              
                $("#news").html(generateArticleHtml(articles));
                else{
                $("#news").html(errorHtml("Error fetching headlines"));                  
                }

            })
            .catch(error => {
                console.log(error);
            });

    }

    function generateArticleHtml(articles){
      if (!articles.length > 0)
      return errorHtml();
      return  articles.reduce((acc, article, i) => {
        let html = ``;
        if (i % 3 == 0 || i == 0) {
            if (i > 0) html += `</div>`;
            html += `<div class='row'>`;
        }
        html += ` 
<div class="col s12 m4 ">
<div class="card">
<div class="card-image waves-effect waves-block waves-light">
    <img class="activator" src="${article.urlToImage}">
</div>
<div class="card-content">
    <span class="card-title activator grey-text text-darken-4">${
      article.title
    }</span>
    <p><a target="_blank" href="${
      article.url
    }" class="waves-effect waves-teal btn-flat green darken-5 white-text">View Story</a></p>
</div>
<div class="card-reveal">
    <span class="card-title grey-text text-darken-4">${
      article.title
    }<i class="material-icons right">close</i></span>
    <p>${article.description}</p>
</div>
</div>
</div>
`;

        if (articles[i + 1] == undefined) html += `</div>`;

        return `${acc} ${html}`;
    }, "");
    }

    function errorHtml(message = ''){
      return  `
      <div class="row">
        <h1> <i class="material-icons error"></i> </h1>
         <p class="red-text darken-5"> OOps Some error Occured </p>
         <h4 class="black-text "> ${message} </h4>
         <div class="row"> <div class="btn-flat green white-text" id="reload" onclick="(function(){ window._app.reload(); })()">reload</div></div> </div>
      </div>`;
    }

    function renderSourceFilter() {

        fetchAllSources().then(sources => {
                let selectHtml = sources.reduce((acc, source) => {
                    return `${acc} 
                    <option value="${source["id"]}" >${source.name}</option> `;
                }, `<option value="" disabled selected>Choose your option</option>`);

                $('#source_filter').html(selectHtml);
                $('select').material_select();
            })
            .catch(error => {
                console.log(error);
            });

    }

    function renderCountryFilter() {

        let selectHtml = countries.reduce((acc, country) => {
            return `${acc} 
            <option value="${country["alpha-2"]}" >${country.name}</option> `;
        }, `<option value="" disabled selected>Choose your option</option>`);

        $('#country_filter').html(selectHtml);
        $('select').material_select();

    }

    function fetchRecentHeadlines() {
      var getPromise =  $.ajax({
        type: "GET",
        url: API_URL + '/top-headlines',
        headers: {
            Authorization: `Bearer ${API_KEY}`
        },
        data: {
            country: "ng"
        }
      });

    return getPromise.
      then((res) => {
        return dbClear('headlines').then( () => {
          return dbSave('headlines',res.articles).then( () => {
            return dbGetAll('headlines');
          })
        })
      }).catch( (err) => {
        console.error(err);
        return dbGetAll('headlines');        
      })
    }


    function fetchAllSources() {
      var getPromise =  $.ajax({
        type: "GET",
        url: API_URL + '/sources',
        headers: {
            Authorization: `Bearer ${API_KEY}`
        }
      });

    return getPromise.
      then((res) => {
        return dbClear('sources').then( () => {
          return dbSave('sources',res.sources).then( () => {
            return dbGetAll('sources');
          })
        })
      }).catch( (err) => {
        console.error(err);
        return dbGetAll('sources');
      })
    }


    function applyEventListeners(){
      $("#country_filter").on('change',() => {
        applyFilter('country');
      });

      $("#source_filter").on('change',() => {
        applyFilter('sources');
      });

      $("#reload").on('click',() => {
        renderHeadlines();        
      });
    }

    function applyFilter(type) {
      let country = $("#country_filter").val();
      let sources = $("#source_filter").val();
     
      fetchFilter(type,{sources,country}).then((articles) => {
        
        renderFilter(articles);
      });
    }

    function fetchFilter(type,value) {
      let params = {};
      params[type] = value[type];
      var getPromise =  $.ajax({
        type: "GET",
        url: API_URL + '/top-headlines',
        data:params,
        headers: {
            Authorization: `Bearer ${API_KEY}`
        }
      });

    return getPromise.
      then((res) => {
        return new Promise( (resolve, reject) => {
          setTimeout( () => {
            resolve(res.articles);
          })
        },100)
      }).catch( (err) => {
        console.error(err);
        return [];
      })
    }


    function renderFilter(articles) {
      $("#news").html(generateArticleHtml(articles));  
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js",{ scope : './'}).then(function() {
            console.log("Service Worker Registered");
        });
    }
})();