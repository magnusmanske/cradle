# Cradle

Cradle is a tool to help create Wikibase (eg Wikidata) items that are based on a specific pattern (eg "ancient ceramicist").
These patterns can be defined on-wiki as wikitext or ShEx.
The user is then presented with a form that allows a hard-limited, soft-limited, or free addition of statements.

## Setup

### Config file

- Create a `config.js` JavaScript (_not_ JSON!) file in `public_html`. Make sure the config object remains valid JSON (keys in double quotes etc).
- Copy the code from `config.js.template`, and modify it according to your installation.
- Create an `oauth.ini` file with the OAuth data from your tool, on your wiki, in the tool root directory (_not_ `public_html`!):

```ini
[settings]
agent = YOUR_TOOL_NAME
consumerKey = FOO
consumerSecret = BAR
```

`public_html/config.js` and `oauth.ini` are git-ignored on purpose; `oauth.ini` contains the OAuth consumer secret and must never be committed.

### Composer

Install the required PHP via composer:

```sh
composer install
```

## Project layout

- `public_html/index.html` – page shell, CSS, library loading
- `public_html/vue.js` – bootstrap, routing, parsing of the wikitext form definitions
- `public_html/vue_components/main-page.html` – form list and ShEx entry
- `public_html/vue_components/subject-page.html` – form for a subject definition
- `public_html/vue_components/shex-page.html` – form generated from an EntitySchema
- `public_html/vue_components/form-mixin.js` – shared form state and item creation logic
- `public_html/vue_components/prop-value.html` – one editable statement value
- `public_html/api.php` – OAuth/Widar API endpoint
