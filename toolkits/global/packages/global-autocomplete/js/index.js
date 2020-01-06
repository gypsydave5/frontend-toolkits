const autoComplete = args => {
	const {
		selector,
		resultSelector,
		resultsContainerSelector,
		endpoint,
		staticResultsData,
		minChars = 0,
		componentName,
		onSelect,
		inputDelay = 300,
		requestTimeout = 2000,
		headers = {},
		searchError,
		resultsCallBack
	} = args;

	if (!selector || !resultsCallBack || !resultSelector || !resultsContainerSelector || (!endpoint && !staticResultsData)) {
		console.error('Please provide selector, resultsCallBack, and endpoint or staticResultsData');
		return;
	}

	const input = document.querySelector(selector);
	const container = () => {
		return document.querySelector(`${resultsContainerSelector}`);
	};
	const suggestions = () => {
		return Array.from(document.querySelectorAll(`${resultSelector}`));
	};

	const eventKeys = ['ArrowDown', 'ArrowUp', 'Escape', 'Enter', 'Tab'];

	let inputTimer = null;
	let fetchTimer = null;
	let currentSearchTerm;

	// Keyboard Event Listeners for text input
	const inputEvents = event => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (suggestions().length > 0) {
				suggestions()[0].focus();
				input.value = suggestions()[0].innerText;
			}
		}
	};

	const removeSuggestions = event => {
		if (event && event.target.matches(`[data-component=${componentName}]`)) {
			return;
		}
		input.removeEventListener('keyup', inputEvents);
		if (container()) {
			container().remove();
		}
		document.removeEventListener('click', removeSuggestions);
		input.focus();
	};

	const addSuggestionEventListeners = () => {
		if (container() === null) {
			return;
		}

		container().addEventListener('keydown', event => {
			if (['Escape', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
				event.preventDefault();
				event.stopPropagation();
			}

			let activeElement = document.activeElement;
			let nextSibling = activeElement.nextSibling;
			let prevSibling = activeElement.previousSibling;
			let currentIndex = parseInt(activeElement.dataset.index, 10);

			switch (event.key) {
				case 'ArrowDown':
					if (nextSibling) {
						input.value = ((currentIndex + 1) < suggestions().length) ? nextSibling.innerText : currentSearchTerm;
						nextSibling.focus();
					}
					break;

				case 'ArrowUp':
					if (prevSibling) {
						input.value = prevSibling.innerText;
						prevSibling.focus();
					} else {
						input.focus();
						input.value = currentSearchTerm;
					}
					break;

				case 'Escape':
					removeSuggestions();
					input.value = currentSearchTerm;
					break;
				default:
					break;
			}
		});

		suggestions().forEach(el => {
			el.addEventListener('click', () => {
				if (onSelect) {
					onSelect(el.textContent);
				}
				removeSuggestions();
			});
			el.addEventListener('keyup', event => {
				if (event.key === 'Enter') {
					if (onSelect) {
						onSelect(el.textContent);
					}
					removeSuggestions();
				}
			});
		});
	};

	const generateSuggestions = data => {
		removeSuggestions();
		let resultsLength = data.length;
		if (resultsLength > 0) {
			input.addEventListener('keyup', inputEvents);
		} else {
			data.push('No results');
		}

		document.addEventListener('click', removeSuggestions);
		resultsCallBack.call(this, data);
		if (resultsLength > 0) {
			addSuggestionEventListeners();
		}
	};

	const handleData = term => {
		if (staticResultsData) {
			generateSuggestions(staticResultsData);
			return;
		}

		const fetchData = new Promise((resolve, reject) => {
			fetch(endpoint + term, {
				'content-type': 'application/json',
				headers
			}).then(response => {
				if (response.status === 200 && response.ok) {
					return response.json();
				}
			}).then(responseJson => {
				if (responseJson) {
					generateSuggestions(responseJson);
					resolve();
				} else {
					searchError();
				}
			}).catch(err => {
				reject(err);
			});
		});

		let fetchTimeout = new Promise((resolve, reject) => {
			fetchTimer = setTimeout(() => {
				clearTimeout(fetchTimer);
				reject(new Error('Timed out'));
			}, requestTimeout);
		});

		Promise.race([
			fetchData,
			fetchTimeout
		]).catch(err => {
			searchError(err);
		});
	};

	const listenForInput = event => {
		currentSearchTerm = input.value;
		if (!eventKeys.includes(event.key) && input.value.length >= minChars) {
			if (!inputTimer) {
				inputTimer = setTimeout(() => {
					window.clearTimeout(inputTimer);
					inputTimer = null;
					handleData(input.value);
				}, inputDelay);
			}
		}

		if (event.key === 'Escape') {
			removeSuggestions(event);
		}
		if (event.key === 'Enter') {
			event.preventDefault();
		}
	};

	const enable = () => {
		if (input) {
			input.addEventListener('keyup', listenForInput);
		}
	};

	const disable = () => {
		removeSuggestions();
		input.removeEventListener('keyup', listenForInput);
	};

	return {
		enable: enable,
		disable: disable
	};
};

module.exports = autoComplete;
