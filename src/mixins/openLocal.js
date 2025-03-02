/*
 * @copyright Copyright (c) 2023 Julius Härtl <jus@bitgrid.net>
 *
 * @author Julius Härtl <jus@bitgrid.net>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { encodePath } from '@nextcloud/paths'
import { getRootUrl, generateOcsUrl } from '@nextcloud/router'
import { getNextcloudUrl } from '../helpers/url.js'

// FIXME: Migrate to vue component
export default {
	data() {
		return {
			openingLocally: false,
		}
	},
	methods: {
		startOpenLocalProcess() {
			this.showOpenLocalConfirmation()
		},
		async unlockAndOpenLocally() {
			if (this.openingLocally) {
				let shouldContinue = true
				try {
					await this.unlockFile()
				} catch (e) {
					shouldContinue = e.response.status === 400
				}

				if (shouldContinue) {
					this.openLocally()
				}
			}
		},

		showOpenLocalConfirmation() {
			window.OC.dialogs.confirmDestructive(
				t('richdocuments', 'When opening a file locally, the document will close for all users currently viewing the document.'),
				t('richdocuments', 'Open file locally'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('richdocuments', 'Open locally'),
					confirmClasses: 'error',
					cancel: t('richdocuments', 'Continue editing online'),
				},
				(decision) => {
					if (!decision) {
						return
					}
					this.openingLocally = true
					this.sendPostMessage('Get_Views')
				})
		},

		showOpenLocalFinished() {
			const fileName = this.filename
			window.OC.dialogs.confirmDestructive(
				t('richdocuments', 'The file should now open locally. If you don\'t see this happening, make sure that the desktop client is installed on your system.'),
				t('richdocuments', 'Open file locally'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('richdocuments', 'Retry to open locally'),
					confirmClasses: 'primary',
					cancel: t('richdocuments', 'Continue editing online'),
				},
				(decision) => {
					if (!decision) {
						window.OCA.Viewer.open(fileName)
						return
					}
					this.openingLocally = true
					this.sendPostMessage('Get_Views')
				})
		},

		unlockFile() {
			const unlockUrl = getRootUrl() + '/index.php/apps/richdocuments/wopi/files/' + this.fileid
			const unlockConfig = {
				headers: { 'X-WOPI-Override': 'UNLOCK' },
			}
			return axios.post(unlockUrl, { access_token: this.formData.accessToken }, unlockConfig)
		},

		openLocally() {
			if (this.openingLocally) {
				this.openingLocally = false

				axios.post(
					generateOcsUrl('apps/files/api/v1/openlocaleditor'),
					{ path: this.filename },
				).then((result) => {
					const url = 'nc://open/'
						+ getCurrentUser()?.uid + '@' + getNextcloudUrl()
						+ encodePath(this.filename)
						+ '?token=' + result.data.ocs.data.token

					this.showOpenLocalFinished(url, window.top)
					this.close()
					window.location.href = url
				})
			}
		},
	},
}
