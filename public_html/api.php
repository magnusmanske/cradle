<?PHP

#error_reporting(E_ERROR|E_CORE_ERROR|E_COMPILE_ERROR|E_ALL);
#ini_set('display_errors', 'On');

require '../vendor/autoload.php';

function get_config() {
	$js = file_get_contents('config.js');
	$js = str_replace ( "\n" , ' ' , $js ) ;
	$js = preg_replace ( '|^.*let +config\s*=\s*|' , '' , $js ) ;
	$js = preg_replace ( '|\s*;\s*$|' , '' , $js ) ;
	$j = json_decode($js) ;
	return $j ;
}


$error = '' ;
$buffering = false ;
try {
	$config = get_config() ;
	$widar = new Toolforge\Widar ( 'cradle' , $config->oauth_url ) ;
	$widar->attempt_verification_auto_forward ( $config->cradle_url ) ;
	$widar->authorization_callback = $config->cradle_api ;

	ob_start () ;
	$buffering = true ;
	if ( $widar->render_reponse ( true ) ) {
		ob_end_flush () ;
		exit ( 0 ) ;
	}
	ob_end_clean () ;
	$buffering = false ;
	$error = 'Unknown API action' ;
} catch ( Throwable $e ) { # Exception or Error
	if ( $buffering ) ob_end_clean () ;
	$error = $e->getMessage () ;
}

# Always return an object the client can inspect: widar's checkLogin reads
# `result.query`, so `result` must be present even when the request failed.
print json_encode ( [
	'error' => $error ,
	'result' => [ 'error' => [ 'code' => 'cradle-api-error' , 'info' => $error ] ] ,
] ) ;

?>
