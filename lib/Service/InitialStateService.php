<?php
/*
 * @copyright Copyright (c) 2021 Julius Härtl <jus@bitgrid.net>
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
 *
 */

declare(strict_types=1);

namespace OCA\Richdocuments\Service;

use OCA\Richdocuments\AppInfo\Application;
use OCA\Richdocuments\Db\Wopi;
use OCP\AppFramework\Services\IInitialState;
use OCP\Defaults;
use OCP\IConfig;
use OCP\IURLGenerator;

class InitialStateService {
	private bool $hasProvidedCapabilities = false;

	public function __construct(
		private IInitialState $initialState,
		private CapabilitiesService $capabilitiesService,
		private IURLGenerator $urlGenerator,
		private Defaults $themingDefaults,
		private IConfig $config,
		private ?string $userId,
	) {
	}

	public function provideCapabilities(): void {
		if ($this->hasProvidedCapabilities) {
			return;
		}

		$this->initialState->provideInitialState('productName', $this->capabilitiesService->getProductName());
		$this->initialState->provideInitialState('hasDrawSupport', $this->capabilitiesService->hasDrawSupport());
		$this->initialState->provideInitialState('hasNextcloudBranding', $this->capabilitiesService->hasNextcloudBranding());
		$this->initialState->provideInitialState('instanceid', $this->config->getSystemValue('instanceid'));

		$this->provideOptions();

		$this->hasProvidedCapabilities = true;
	}

	public function provideDocument(Wopi $wopi, array $params): void {
		$this->provideCapabilities();

		$this->initialState->provideInitialState('document', $this->prepareParams($params));

		$this->initialState->provideInitialState('wopi', $wopi);

		$this->provideOptions();
	}

	public function prepareParams(array $params): array {
		$defaults = [
			'instanceId' => $this->config->getSystemValue('instanceid'),
			'canonical_webroot' => $this->config->getAppValue(Application::APPNAME, 'canonical_webroot', ''),
			'userId' => $this->userId,
			'token' => '',
			'token_ttl' => 0,
			'directEdit' => false,
			'directGuest' => false,
			'path' => '',
			'urlsrc' => '',
			'fileId' => '',
			'title' => '',
			'permissions' => '',
			'isPublicShare' => false,
		];

		return array_merge($defaults, $params);
	}

	private function provideOptions(): void {
		$this->initialState->provideInitialState('theme', $this->config->getAppValue(Application::APPNAME, 'theme', 'nextcloud'));
		$this->initialState->provideInitialState('uiDefaults', [
			'UIMode' => $this->config->getAppValue(Application::APPNAME, 'uiDefaults-UIMode', 'notebookbar')
		]);
		$logoSet = $this->config->getAppValue('theming', 'logoheaderMime', '') !== '';
		if (!$logoSet) {
			$logoSet = $this->config->getAppValue('theming', 'logoMime', '') !== '';
		}
		$this->initialState->provideInitialState('theming-customLogo', ($logoSet ?
			$this->urlGenerator->getAbsoluteURL($this->themingDefaults->getLogo())
			: false));
	}
}
