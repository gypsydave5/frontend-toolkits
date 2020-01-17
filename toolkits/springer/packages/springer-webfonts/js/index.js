import FontFaceObserver from 'fontfaceobserver';

/**
 * 1. No need to throw this.
 *	  Access to browser storage can be blocked in the browser settings and that is a valid user choice.
 *	  The try catch is required because sessionStorage will still be defined and JavaScript will error but we want it to fail silently.
 */

function loadFonts(config) {
	const fonts = [].concat.apply([], config.map(font => {
		return font.weights.map(weight => {
			return new FontFaceObserver(font.name, {
				weight: weight
			});
		});
	}));

	return Promise.all(fonts.map(font => {
		return font.load();
	}))
		.then(() => {
			const event = new CustomEvent('webfonts-loaded');
			document.documentElement.dispatchEvent(event);
			try {
				sessionStorage.fontsLoaded = true;
			} catch (error) {
				// -- See note 1
			}
		})
		.catch(error => {
			throw new Error(error);
		});
}

function init(config) {
	let fontsStored = null;

	try {
		fontsStored = sessionStorage.getItem('fontsLoaded');
	} catch (error) {
		// -- See note 1
	}

	if (fontsStored) {
		return;
	}

	return loadFonts(config);
}

export default init;
