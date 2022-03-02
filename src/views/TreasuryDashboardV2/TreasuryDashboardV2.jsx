import { useEffect, useState } from "react";
import { MultifarmProvider, Dashboard } from '@multifarm/widget-demo'
import { Paper, Grid, Typography, Box, Zoom, Container, useMediaQuery } from "@material-ui/core";
import useTheme from "../../hooks/useTheme";

const TOKEN = 'jlgViecb1GCfUKyrgYVA-WlI7oECq7ZL'

export default function TreasuryDashboardV2({theme}) {

	const smallerScreen = useMediaQuery("(max-width: 650px)");
	const verySmallScreen = useMediaQuery("(max-width: 379px)");


	return (
		<div id="treasury-dashboard2-view" className={`${smallerScreen && "smaller"} ${verySmallScreen && "very-small"}`}>
			<Container
				style={{
				paddingLeft: smallerScreen || verySmallScreen ? "0" : "3.3rem",
				paddingRight: smallerScreen || verySmallScreen ? "0" : "3.3rem",
				paddingTop: '5rem'
				}}
			>
				<MultifarmProvider
					token={TOKEN}
					theme='hector'
					themeColors={theme}
					provider='hector'
					key='hector'>
					<Dashboard />
				</MultifarmProvider>
			</Container>
		</div>
	)
}