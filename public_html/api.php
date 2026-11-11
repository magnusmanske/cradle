<?PHP

#error_reporting(E_ERROR|E_CORE_ERROR|E_COMPILE_ERROR|E_ALL);
#ini_set('display_errors', 'On');

require __DIR__ . '/../vendor/autoload.php';

# Read the JavaScript config file. It has to stay a JS file so the frontend
# can load it as well, but its content is plain JSON. Never put secrets here.
function get_config() {
	$file = __DIR__ . '/config.js' ;
	if ( !is_file ( $file ) || !is_readable ( $file ) ) {
		throw new RuntimeException ( 'config.js not found' ) ;
	}
	$js = file_get_contents ( $file ) ;
	$js = str_replace ( "\n" , ' ' , $js ) ;
	$js = preg_replace ( '|.*?\b(?:let|const|var)\s+config\s*=\s*|s' , '' , $js ) ;
	$js = preg_replace ( '|\s*;\s*$|' , '' , $js ) ;
	$config = json_decode ( $js ) ;
	if ( !is_object ( $config ) ) {
		throw new RuntimeException ( 'config.js is not valid JSON: ' . json_last_error_msg () ) ;
	}
	return $config ;
}

# Return an object the client can inspect. Note that widar's checkLogin reads
# `result.query`, so `result` must be present even when the request failed.
# Keep HTTP 200 here: the frontend's login check only looks at successful
# responses, and a non-2xx status would leave the UI without a login link.
function output_error ( $message ) {
	header ( 'Content-Type: application/json; charset=utf-8' ) ;
	print json_encode ( [
		'error' => $message ,
		'result' => [ 'error' => [ 'code' => 'cradle-api-error' , 'info' => $message ] ] ,
	] ) ;
}

$buffering = false ;
try {
	$config = get_config () ;
	$widar = new Toolforge\Widar ( 'cradle' ) ;
	if ( isset ( $widar->oa ) && isset ( $config->oauth_url ) && $config->oauth_url !== '' ) {
		$widar->oa->publicMwOAuthUrl = $config->oauth_url ;
	}
	if ( isset ( $config->cradle_url ) && $config->cradle_url !== '' ) {
		$widar->attempt_verification_auto_forward ( $config->cradle_url ) ;
	}
	$widar->authorization_callback = isset ( $config->cradle_api ) ? $config->cradle_api : '' ;

	ob_start () ;
	$buffering = true ;
	if ( $widar->render_reponse ( true ) ) {
		ob_end_flush () ;
		exit ( 0 ) ;
	}
	ob_end_clean () ;
	$buffering = false ;
	output_error ( 'Unknown API action' ) ;
} catch ( Throwable $e ) { # Exception or Error
	if ( $buffering ) ob_end_clean () ;
	# Do not leak internal details (paths, OAuth state) to the client
	error_log ( 'cradle api: ' . $e->getMessage () ) ;
	output_error ( 'Internal error' ) ;
}

?>
