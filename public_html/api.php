<?PHP

require_once '/data/project/magnustools/public_html/php/Widar.php' ;

function get_config() {
	$js = file_get_contents('config.js');
	$js = str_replace ( "\n" , ' ' , $js ) ;
	$js = preg_replace ( '|^.*let +config\s*=\s*|' , '' , $js ) ;
	$js = preg_replace ( '|\s*;\s*$|' , '' , $js ) ;
	$j = json_decode($js) ;
	return $j ;
}


$j = get_config() ;
$widar = new \Widar ( 'cradle' ) ;
#if ( isset($_REQUEST['testing']) ) print_r($widar) ;
$widar->attempt_verification_auto_forward ( '/' ) ;
$widar->authorization_callback = $j->cradle_api ;
if ( $widar->render_reponse(true) ) exit(0);

?>