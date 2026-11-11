'use strict';

// Shared form logic for the subject-based and ShEx-based pages.
// Both pages render the same editable field list and create items in the same
// way, so keeping the logic here avoids the two pages drifting apart.
let CradleFormMixin = {
	data : function () {
		return {
			s : {} ,
			data : {} ,
			lads : [ 'labels' , 'aliases' , 'descriptions' ] ,
			can_create_new_item : false ,
			creation_data : {} ,
			warning_messages : [] ,
			created_items : [] ,
			vue_key_num : 0 ,
			loading : true ,
			error_message : '' ,
			create_item_log_method : '' ,
			load_timeout : ''
		} ;
	} ,
	computed : {
		// One list for the fixed label/alias/description fields plus the
		// properties defined by the form, so the template only has one loop.
		fields : function () {
			let me = this ;
			let ret = [] ;
			$.each ( me.lads , function ( dummy , key ) {
				ret.push ( { key:key , is_lad:true , pv:undefined , mandatory:(key=='labels') } ) ;
			} ) ;
			$.each ( me.s.props || {} , function ( key , pv ) {
				ret.push ( { key:key , is_lad:false , pv:pv , mandatory:!!pv.mandatory } ) ;
			} ) ;
			return ret ;
		}
	} ,
	methods : {
		beginLoading : function () {
			let me = this ;
			// getItemBatch has no failure callback, so do not spin forever
			me.load_timeout = setTimeout ( function () {
				if ( me.loading ) me.error_message = 'Could not load data from the wiki. Please reload the page.' ;
			} , 15000 ) ;
		} ,
		finishLoading : function () {
			let me = this ;
			clearTimeout ( me.load_timeout ) ;
			me.error_message = '' ;
			me.loading = false ;
			me.updateEditElement() ;
		} ,
		newElement : function () {
			return { vue_key : ( this.vue_key_num++ ) } ;
		} ,
		initFormData : function () {
			let me = this ;
			me.data = {} ;
			$.each ( me.fields , function ( dummy , f ) {
				me.$set ( me.data , f.key , [ me.newElement() ] ) ;
			} ) ;
			me.updateEditElement() ;
		} ,
		resetForm : function () {
			this.initFormData() ;
		} ,
		onAddElement : function ( prop ) {
			this.data[prop].push ( this.newElement() ) ;
			this.updateEditElement() ;
		} ,
		onRemoveElement : function ( prop , num ) {
			this.data[prop].splice ( num , 1 ) ;
			this.updateEditElement() ;
		} ,
		onDataChanged : function ( d ) {
			var me = this ;
			let entries = me.data[d.prop] ;
			if ( typeof entries == 'undefined' ) return ;
			// Look the row up by its stable key: the numeric index changes when
			// rows are removed, so trusting d.num would update the wrong row.
			let idx = -1 ;
			$.each ( entries , function ( i , e ) {
				if ( e && e.vue_key === d.vue_key ) { idx = i ; return false ; }
			} ) ;
			if ( idx < 0 ) return ;
			entries.splice ( idx , 1 , d ) ;
			me.updateEditElement() ;
		} ,
		updateEditElement : function () {
			var me = this ;
			let data = {} ;
			me.warning_messages = [] ;
			me.can_create_new_item = false ;
			let can_create = false ;
			let prop_counter = {} ;
			$.each ( me.data , function ( prop , entries ) {
				$.each ( entries , function ( num , e ) {
					if ( !e || !e.is_valid || typeof e.statement == 'undefined' ) return ;
					if ( -1 !== $.inArray ( prop , me.lads ) ) {
						if ( typeof data[prop] == 'undefined' ) data[prop] = [] ;
						data[prop].push ( e.statement ) ;
					} else {
						if ( typeof data.claims == 'undefined' ) data.claims = [] ;
						if ( typeof prop_counter[prop] == 'undefined' ) prop_counter[prop] = 0 ;
						prop_counter[prop]++ ;
						data.claims.push ( e.statement ) ;
					}
					can_create = true ;
				} ) ;
			} ) ;
			$.each ( me.s.props || {} , function ( prop , v ) {
				if ( !v.mandatory ) return ;
				if ( typeof prop_counter[prop] != 'undefined' ) return ;
				can_create = false ;
				let label = prop ;
				let i = wd.getItem ( prop ) ;
				if ( typeof i != 'undefined' ) label = i.getLabel ( tt.language ) ;
				me.warning_messages.push ( prop + ( label != prop ? ' (' + label + ')' : '' ) + ' is required' ) ;
			} ) ;
			me.creation_data = JSON.parse(JSON.stringify(data)) ;
			if ( typeof data.labels == 'undefined' ) {
				can_create = false ;
				me.warning_messages.push ( "At least one label is required" ) ;
			}
			me.can_create_new_item = can_create ;
		} ,
		doCreateItem : function () {
			var me = this ;
			if ( !me.can_create_new_item ) return ;
			me.warning_messages = [ 'Creating item…' ] ;
			me.can_create_new_item = false ;
			let command = {
				action:'wbeditentity',
				new:'item',
				data:JSON.stringify(me.creation_data)
			} ;
			$('#working').show() ;
			let params = {
				action:'generic',
				json:JSON.stringify(command) ,
				tool_hashtag:'cradle' ,
				botmode:1
			} ;

			// Do not retry forever if widar keeps failing
			if ( typeof widar != 'undefined' ) widar.maximum_number_of_tries = 3 ;

			widar.run ( params , function ( d ) {
				$('#working').hide() ;
				d = d || {} ;
				if ( d.error != 'OK' || typeof d.res == 'undefined' || typeof d.res.entity == 'undefined' ) {
					console.log ( JSON.parse(JSON.stringify(me.creation_data)) ) ;
					let msg = ( d.error && d.error != 'OK' ) ? d.error : 'Unexpected response from the server.' ;
					me.warning_messages = [ msg ] ;
					me.can_create_new_item = true ;
					return ;
				}
				me.created_items.unshift ( d.res.entity.id ) ;
				me.logCreate() ;
				// Clear the form so the same item is not accidentally created twice
				me.resetForm() ;
				me.warning_messages = [] ;
			} ) ;
		} ,
		logCreate : function () {
			let me = this ;
			if ( me.create_item_log_method == '' ) return ;
			$.ajax ( {
				url : 'https://magnustools.toolforge.org/logger/' ,
				data : { tool:'cradle' , method:me.create_item_log_method } ,
				dataType : 'jsonp'
			} ) ;
		} ,
		initializeDataFromItem : function ( q ) {
			// TODO: pre-fill the form from an existing item
			let me = this ;
		} ,
	}
} ;
