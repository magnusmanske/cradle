'use strict';

let router ;
let app ;
let wd = new WikiData() ;

let subjects = {} ;

// Show a site-level error outside the Vue app, so it survives config/load
// problems (when we cannot mount the app at all).
function show_error ( msg ) {
	$('#app-error')
		.empty()
		.append ( $('<div class="container mt-3"></div>')
			.append ( $('<div class="alert alert-danger mb-0" role="alert"></div>').text ( msg ) ) ) ;
}

// Load and parse a wiki page's wikitext. Uses the MediaWiki CORS API
// (origin=*) rather than JSONP; `wd.getItemBatch` already relies on CORS.
function load_wikitext ( page , callback , error_callback ) {
	$.ajax ( {
		url : config.wikibase_api ,
		data : {
			action : 'parse' ,
			page : page ,
			prop : 'wikitext' ,
			format : 'json' ,
			origin : '*'
		} ,
		dataType : 'json' ,
		timeout : 15000
	} )
	.done ( function ( d ) {
		if ( typeof d.error != 'undefined' || typeof d.parse == 'undefined' || typeof d.parse.wikitext == 'undefined' ) {
			error_callback ( 'Page "' + page + '" could not be loaded.' ) ;
			return ;
		}
		callback ( d.parse.wikitext['*'] ) ;
	} )
	.fail ( function () {
		error_callback ( 'Page "' + page + '" could not be loaded. Check your connection and reload.' ) ;
	} ) ;
}

function normaliseProp ( prop ) {
	prop = String ( prop ).trim().toUpperCase() ;
	return /^P\d+$/.test(prop) ? prop : '' ;
} ;

// Parse the form definitions from the source page wikitext. Format:
//   == Subject name ==
//   :en:Label for the subject
//   ;P31:hardselect:Q5,Q6|softselect:Q5
//   ;P106
function parseSourceData ( wikitext ) {
	subjects = {} ;
	let key = '' ;
	let lines = wikitext.split ( /\r?\n/ ) ;
	$.each ( lines , function ( dummy , row ) {
		let m = row.match ( /^={2,}\s*(.+?)\s*=+\s*$/ ) ;
		if ( m !== null ) {
			key = m[1].trim().toLowerCase().replace ( /\s+/g , '_' ) ;
			if ( typeof subjects[key] == 'undefined' ) subjects[key] = { labels:{} , props:{} } ;
			return ;
		}
		if ( key == '' || typeof subjects[key] == 'undefined' ) return ;

		// Labels: ":en:Some label"
		if ( (m=row.match(/^:([A-Za-z][A-Za-z0-9_-]*):(.*)$/)) !== null ) {
			subjects[key].labels[m[1].toLowerCase()] = m[2].trim() ;
			return ;
		}

		// Property with options: ";P31:hardselect:Q5|softselect:Q6"
		if ( (m=row.match(/^;\s*(.+?)\s*:\s*(.+?)\s*$/)) !== null ) {
			let prop = normaliseProp ( m[1] ) ;
			if ( prop == '' ) return ;
			if ( typeof subjects[key].props[prop] == 'undefined' ) subjects[key].props[prop] = {} ;
			let pv = subjects[key].props[prop] ;
			$.each ( m[2].split ( '|' ) , function ( dummy2 , part ) {
				let p = part.match ( /^\s*(.+?)\s*:\s*(.+?)\s*$/ ) ;
				if ( p !== null ) {
					pv[p[1].trim().toLowerCase()] = p[2].trim() ;
				} else if ( (p=part.match(/^\s*(.+?)\s*$/)) !== null ) {
					pv[p[1].trim().toLowerCase()] = 1 ;
				}
			} ) ;
			return ;
		}

		// Property without options: ";P31" or ";P31:"
		if ( (m=row.match(/^;\s*(.+?)\s*:?\s*$/)) !== null ) {
			let prop = normaliseProp ( m[1] ) ;
			if ( prop == '' ) return ;
			if ( typeof subjects[key].props[prop] == 'undefined' ) subjects[key].props[prop] = {} ;
		}
	} ) ;
} ;

function loadSourcePage ( callback ) {
	load_wikitext ( config.source_page , function ( wikitext ) {
		try {
			parseSourceData ( wikitext ) ;
		} catch ( e ) {
			console.log ( e ) ;
			show_error ( 'The form definitions could not be parsed.' ) ;
		}
		callback() ;
	} , function ( msg ) {
		show_error ( msg ) ;
		callback() ;
	} ) ;
} ;

$(document).ready ( function () {

    if ( typeof config == 'undefined' ) {
        $('#app').empty() ;
        show_error ( 'Configuration missing. Create public_html/config.js from config.js.template.' ) ;
        return ;
    }
    if ( typeof config.wikibase_api == 'undefined' || typeof config.cradle_api == 'undefined' ) {
        $('#app').empty() ;
        show_error ( 'Configuration incomplete: wikibase_api and cradle_api are required in config.js.' ) ;
        return ;
    }

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
        widar_api_url = config.cradle_api ;

        wd.set_custom_api ( config.wikibase_api , function () {
            wd_link_wd = wd ;
            $('#help_page').attr ( 'href' , wd.page_path.replace ( /\$1/ , config.source_page ) ) ;
            loadSourcePage ( function () {
              const routes = [
                { path: '/', component: MainPage , props:true },
                { path: '/subject/:subject', component: SubjectPage , props:true },
                { path: '/subject/:subject/:q', component: SubjectPage , props:true },
                { path: '/shex/:e', component: ShexPage , props:true },
              ] ;
              router = new VueRouter({routes}) ;
              app = new Vue ( { router } ) .$mount('#app') ;
            } ) ;
        } ) ;

    } )
    .catch ( function ( e ) {
        console.log ( e ) ;
        $('#app').empty() ;
        show_error ( 'Could not load the application. Please reload the page.' ) ;
    } ) ;
} ) ;
