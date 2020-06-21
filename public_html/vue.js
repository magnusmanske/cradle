'use strict';

let router ;
let app ;
let wd = new WikiData() ;

let subjects = {} ;

$(document).ready ( function () {

    function loadSourcePage ( callback ) {
        $.getJSON ( config.api+'?callback=?' , {
            action:'parse',
            page:config.source_page,
            prop:'wikitext' ,
            format:'json'
        } , function ( d ) {
            parseSourceData ( d.parse.wikitext['*'] , callback ) ;
        } )
    } ;

    function parseSourceData ( wikitext , callback ) {
        let rows = wikitext.split ( "\n" ) ;
        subjects = {} ;
        let key = '' ;
        let to_load = [] ;
        $.each ( rows , function ( dummy , row ) {
            let m = row.match ( /^={2,}\s*(.+?)\s*=+$/ )
            if ( m !== null ) {
                key = m[1].toLowerCase().replace(/ /g,'_') ;
                subjects[key] = { labels:{} , props:{} }
                return ;
            }
            if ( (m=row.match(/^:([a-z-]+):(.+?)$/)) !== null ) {
                subjects[key].labels[m[1]] = m[2] ;
            } else if ( (m=row.match(/^;\s*(.+?)\s*:\s*(.+?)\s*$/)) !== null ) {
                let prop = m[1] ;
                let parts = m[2].split ( '|' ) ;
                to_load.push ( prop ) ;
                subjects[key].props[prop] = {} ;
                $.each ( parts , function ( dummy2 , part ) {
                    if ( (m=part.match(/^\s*(.+?)\s*:\s*(.+?)\s*$/)) !== null ) {
                        subjects[key].props[prop][m[1]] = m[2] ;
                    } else if ( (m=part.match(/^\s*(.+?)\s*$/)) !== null ) {
                      subjects[key].props[prop][m[1]] = 1 ;
                    }
                } ) ;
            } else if ( (m=row.match(/^;(.+?)\s*:{0,1}\s*$/)) !== null ) {
                let prop = m[1] ;
                to_load.push ( prop ) ;
                subjects[key].props[prop] = {} ;
            }
        } ) ;
//        console.log ( subjects ) ;
        wd.getItemBatch ( to_load , function () {
            callback() ;
        } ) ;
    } ;


    vue_components.toolname = 'cradle' ;
//    vue_components.components_base_url = 'https://tools.wmflabs.org/magnustools/resources/vue/' ; // For testing; turn off to use tools-static
    Promise.all ( [
        vue_components.loadComponents ( ['wd-date','wd-link','tool-translate','tool-navbar','commons-thumbnail','widar','autodesc','typeahead-search','value-validator',
            'vue_components/prop-value.html',
            'vue_components/main-page.html',
            'vue_components/subject-page.html',
            'vue_components/shex-page.html',
            ] )
    ] )
    .then ( () => {
        widar_api_url = 'https://cradle.toolforge.org/api.php' ;

        wd.set_custom_api ( config.api , function () {
            wd_link_wd = wd ;
            loadSourcePage ( function () {
              const routes = [
                { path: '/', component: MainPage , props:true },
                { path: '/subject/:subject', component: SubjectPage , props:true },
                { path: '/subject/:subject/:q', component: SubjectPage , props:true },
                { path: '/shex/:e', component: ShexPage , props:true },
              ] ;
              router = new VueRouter({routes}) ;
              app = new Vue ( { router } ) .$mount('#app') ;
              $('#help_page').attr('href',wd.page_path.replace(/\$1/,config.source_page));
            } ) ;
        } ) ;

    } ) ;
} ) ;
