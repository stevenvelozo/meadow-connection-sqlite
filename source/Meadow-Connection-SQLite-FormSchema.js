/**
 * Connection form schema for SQLite.
 *
 * Consumed by meadow-connection-manager#getProviderFormSchema('SQLite').
 * Pure data — safe to require() even when better-sqlite3 is not
 * installed.  See Meadow-Connection-MySQL-FormSchema.js for the field
 * contract.
 *
 * SQLite is file-based; the only configurable input is the path to the
 * database file.  A leading `~` is expanded to the user's home directory
 * by retold-data-service before the connection is opened.
 */
'use strict';

module.exports =
{
	Provider:    'SQLite',
	DisplayName: 'SQLite',
	Description: 'Open or create a local SQLite database file.',
	Fields:
	[
		{
			Name:        'SQLiteFilePath',
			Label:       'SQLite File Path',
			Type:        'Path',
			Default:     '~/headlight-liveconnect-local/cloned.sqlite',
			Required:    true,
			Placeholder: '~/headlight-liveconnect-local/cloned.sqlite',
			Help:        'A leading ~ is expanded to your home directory.  Parent directories are created automatically.'
		}
	]
};
