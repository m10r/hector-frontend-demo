import { MultifarmProvider, Dashboard } from '@multifarm/widget-demo'

const TOKEN = 'jlgViecb1GCfUKyrgYVA-WlI7oECq7ZL'

export default function TreasuryDashboardV2() {
	return (
		<MultifarmProvider
			token={TOKEN}
			theme='hector'
			themeColors='light'
			provider='hector'
			key='hector'>
			<Dashboard />
		</MultifarmProvider>
	)
}