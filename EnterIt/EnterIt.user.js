// ==UserScript==
// @name               EnterIt
// @name:zh-CN         EnterIt
// @name:zh-TW         EnterIt
// @namespace          http://tampermonkey.net/
// @version            1.2.5
// @description        Support Enter for new line and Ctrl+Enter to send in various AI assistant web input boxes
// @description:zh-CN  支持在各种 AI 助手网页端输入框按回车换行，Ctrl+回车发送
// @description:zh-TW  支援在各種 AI 助手網頁端輸入框，以 Enter 譜寫換行的詩篇，以 Ctrl+Enter 傳送命運的覺悟。
// @author             Clover Yan
// @homepage           https://cloveryan.com/
// @match              https://chatgpt.com/*
// @match              https://claude.ai/*
// @match              https://www.google.com/*
// @match              https://gemini.google.com/*
// @match              https://www.perplexity.ai/*
// @match              https://chat.deepseek.com/*
// @match              https://github.com/*
// @match              https://notebooklm.google.com/*
// @match              https://www.phind.com/*
// @match              https://poe.com/*
// @match              https://chat.mistral.ai/*
// @match              https://you.com/*
// @match              https://v0.dev/*
// @match              https://copilot.microsoft.com/*
// @match              https://m365.cloud.microsoft/*
// @match              https://yuanbao.tencent.com/*
// @match              https://www.doubao.com/*
// @match              https://www.qianwen.com/*
// @match              https://chat.qwen.ai/*
// @match              https://yiyan.baidu.com/*
// @icon               https://cloveryan.com/favicon.png
// @grant              none
// @run-at             document-start
// @license            AGPL-3.0-or-later
// ==/UserScript==

(function () {
	"use strict";

	function replaceAll(str, search, replace) {
		if (typeof str.replaceAll === "function") {
			return str.replaceAll(search, replace);
		}
		return str.replace(
			new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
			replace,
		);
	}

	function isChatGPTComposer(element) {
		if (!element) return false;
		if (element.id === "prompt-textarea") return true;
		return (
			element.tagName === "DIV" &&
			element.contentEditable === "true" &&
			element.classList.contains("ProseMirror")
		);
	}

	function dispatchChatGPTEnter(composer, modifiers) {
		composer.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				code: "Enter",
				bubbles: true,
				cancelable: true,
				ctrlKey: false,
				metaKey: false,
				shiftKey: false,
				altKey: false,
				...modifiers,
			}),
		);
	}

	function handleChatGPT(event) {
		if (!event.isTrusted || event.isComposing) return false;
		if (event.key !== "Enter") return false;

		// ChatGPT's composer used to be <textarea id="prompt-textarea"> and is now
		// a ProseMirror contenteditable div without that id, so match the editor
		// itself instead of relying on the id.
		const composer = isChatGPTComposer(event.target)
			? event.target
			: event.target.closest?.('.ProseMirror[contenteditable="true"]');
		if (!composer) return false;

		if (event.altKey) return false;

		const isCtrlEnter = event.ctrlKey || event.metaKey;
		const isShiftEnter = event.shiftKey;

		// Shift+Enter already inserts a newline.
		if (isShiftEnter && !isCtrlEnter) return false;

		// ChatGPT sends on Enter and sends in the background on Ctrl+Enter, but
		// its settings page refuses to remap them (the "send comment" shortcut
		// also uses Ctrl+Enter). Do the remapping ourselves:
		//   Enter              -> Shift+Enter  (newline)
		//   Ctrl/Cmd+Enter     -> Enter        (send, switches to the chat)
		//   Ctrl/Cmd+Shift+Enter -> Ctrl+Enter (send in background)
		event.preventDefault();
		event.stopImmediatePropagation();

		if (isCtrlEnter && isShiftEnter) {
			dispatchChatGPTEnter(composer, {
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
			});
		} else if (isCtrlEnter) {
			dispatchChatGPTEnter(composer, {});
		} else {
			dispatchChatGPTEnter(composer, { shiftKey: true });
		}

		return true;
	}

	function shouldHandleCtrlEnter(url, search, event) {
		if (url.startsWith("https://claude.ai")) {
			return (
				(event.target.tagName === "DIV" &&
					event.target.contentEditable === "true") ||
				event.target.tagName === "TEXTAREA"
			);
		} else if (url.startsWith("https://notebooklm.google.com")) {
			return (
				event.target.tagName === "TEXTAREA" &&
				event.target.classList.contains("query-box-input")
			);
		} else if (url.startsWith("https://www.google.com")) {
			return event.target.tagName === "TEXTAREA";
		} else if (url.startsWith("https://gemini.google.com")) {
			return (
				((event.target.tagName === "DIV" &&
					event.target.classList.contains("ql-editor") &&
					event.target.contentEditable === "true") ||
					event.target.tagName === "TEXTAREA") &&
				!(event.shiftKey && event.key === "Enter")
			);
		} else if (url.startsWith("https://www.phind.com")) {
			return (
				event.target.tagName === "DIV" &&
				event.target.classList.contains("public-DraftEditor-content") &&
				event.target.contentEditable === "true"
			);
		} else if (url.startsWith("https://chat.deepseek.com")) {
			return event.target.tagName === "TEXTAREA";
		} else if (url.startsWith("https://github.com")) {
			return (
				event.target.getAttribute("placeholder") === "Ask Copilot" ||
				event.target.getAttribute("placeholder") === "Ask anything" ||
				event.target.getAttribute("id") === "copilot-chat-textarea"
			);
		} else if (url.startsWith("https://m365.cloud.microsoft/chat")) {
			return event.target.id === "m365-chat-editor-target-element";
		} else if (url.startsWith("https://www.perplexity.ai")) {
			return (
				event.target.tagName === "DIV" &&
				event.target.contentEditable === "true" &&
				event.target.id === "ask-input"
			);
		} else if (url.startsWith("https://yuanbao.tencent.com")) {
			return (
				event.target.tagName === "DIV" &&
				event.target.classList.contains("ql-editor") &&
				event.target.contentEditable === "true"
			);
		} else if (url.startsWith("https://www.qianwen.com")) {
			return (
				event.target.tagName === "DIV" &&
				event.target.getAttribute("role") === "textbox" &&
				event.target.contentEditable === "true"
			);
		} else if (url.startsWith("https://yiyan.baidu.com")) {
			return (
				event.target.tagName === "DIV" &&
				event.target.getAttribute("role") === "textbox" &&
				event.target.contentEditable === "true"
			);
		}

		return false;
	}

	function findNBLMSendButton() {
		const submitButton = document.querySelector(
			'query-box form button[type="submit"]',
		);
		if (submitButton) return submitButton;
		return null;
	}

	function handleCustomInputs(event) {
		const url = window.location.href;
		const search = window.location.search;

		if (event.isComposing) {
			return false;
		}

		if (!shouldHandleCtrlEnter(url, search, event) || !event.isTrusted) {
			return false;
		}

		const isOnlyEnter =
			event.key === "Enter" && !(event.ctrlKey || event.metaKey);
		const isCtrlEnter =
			event.key === "Enter" && (event.ctrlKey || event.metaKey);

		if (isOnlyEnter || isCtrlEnter) {
			const preventDefaultSites = [
				"https://claude.ai",
				"https://www.phind.com",
				"https://www.perplexity.ai",
				"https://yuanbao.tencent.com",
			];
			if (preventDefaultSites.some((site) => url.startsWith(site))) {
				event.preventDefault();
			}
			event.stopImmediatePropagation();

			let eventConfig = {
				key: "Enter",
				code: "Enter",
				bubbles: true,
				cancelable: true,
				shiftKey: isOnlyEnter,
			};

			if (url.startsWith("https://www.phind.com")) {
				eventConfig.keyCode = 13;
			}

			if (url.startsWith("https://m365.cloud.microsoft/chat") && isCtrlEnter) {
				eventConfig.keyCode = 13;
			}

			if (url.startsWith("https://chat.deepseek.com")) {
				eventConfig.keyCode = 13;
				eventConfig.composed = true;
			}

			if (url.startsWith("https://yiyan.baidu.com")) {
				eventConfig.keyCode = 13;
			}

			const newEvent = new KeyboardEvent("keydown", eventConfig);
			event.target.dispatchEvent(newEvent);

			if (isCtrlEnter && url.startsWith("https://notebooklm.google.com")) {
				const sendButton = findNBLMSendButton();
				if (sendButton) {
					sendButton.click();
				}
			}

			if (
				url.startsWith("https://claude.ai") &&
				event.target.tagName === "TEXTAREA"
			) {
				if (isOnlyEnter) {
					const textarea = event.target;
					const start = textarea.selectionStart;
					const end = textarea.selectionEnd;
					const value = textarea.value;
					textarea.value =
						value.substring(0, start) + "\n" + value.substring(end);
					textarea.selectionStart = textarea.selectionEnd = start + 1;
					textarea.dispatchEvent(new Event("input", { bubbles: true }));
				} else if (isCtrlEnter) {
					const saveButton = document.querySelector('button[type="submit"]');
					if (saveButton) {
						saveButton.click();
					}
				}
			}

			return true;
		}

		return false;
	}

	function handleTextarea(event) {
		if (event.target.tagName !== "TEXTAREA" || !event.isTrusted) {
			return false;
		}

		const isOnlyEnter =
			event.key === "Enter" && !(event.ctrlKey || event.metaKey);

		if (isOnlyEnter) {
			event.stopPropagation();
			return true;
		} else {
			const isCtrlEnter =
				event.key === "Enter" && (event.ctrlKey || event.metaKey);
			if (isCtrlEnter) {
				// Google AI Mode ignores synthetic keydown events, so click its
				// send button instead of re-dispatching Enter.
				if (window.location.href.startsWith("https://www.google.com")) {
					const sendButton = document.querySelector(
						'button[data-xid="input-plate-send-button"]',
					);
					if (sendButton && !sendButton.disabled) {
						event.preventDefault();
						event.stopImmediatePropagation();
						sendButton.click();
						return true;
					}
				}

				const sendCtrlEnterSites = ["https://www.qianwen.com"];
				if (
					sendCtrlEnterSites.some((site) =>
						window.location.href.startsWith(site),
					)
				) {
					event.preventDefault();
					event.stopImmediatePropagation();
					const newEvent = new KeyboardEvent("keydown", {
						key: "Enter",
						code: "Enter",
						bubbles: true,
						cancelable: true,
						shiftKey: false,
					});
					event.target.dispatchEvent(newEvent);
					return true;
				}
			}
		}

		return false;
	}

	function handleKeyDown(event) {
		const url = window.location.href;
		const search = window.location.search;

		if (url.startsWith("https://chatgpt.com")) {
			if (handleChatGPT(event)) return;
		} else if (
			url.startsWith("https://claude.ai") ||
			url.startsWith("https://notebooklm.google.com") ||
			url.startsWith("https://gemini.google.com") ||
			url.startsWith("https://www.phind.com") ||
			url.startsWith("https://chat.deepseek.com") ||
			url.startsWith("https://github.com") ||
			url.startsWith("https://m365.cloud.microsoft") ||
			url.startsWith("https://www.perplexity.ai") ||
			url.startsWith("https://yuanbao.tencent.com") ||
			url.startsWith("https://www.qianwen.com") ||
			url.startsWith("https://yiyan.baidu.com")
		) {
			if (handleCustomInputs(event)) return;
		} else if (
			(url.startsWith("https://www.google.com") &&
				new URLSearchParams(search).get("udm") === "50") ||
			url.startsWith("https://poe.com") ||
			url.startsWith("https://chat.mistral.ai") ||
			url.startsWith("https://you.com") ||
			url.startsWith("https://v0.dev") ||
			url.startsWith("https://copilot.microsoft.com") ||
			url.startsWith("https://www.doubao.com") ||
			url.startsWith("https://chat.qwen.ai")
		) {
			if (handleTextarea(event)) return;
		}
	}

	function fixPlaceholder(placeholderConfig) {
		const editor = document.querySelector(placeholderConfig.selector);
		if (!editor) {
			return;
		}
		const placeholder = placeholderConfig.attribute
			? editor.getAttribute(placeholderConfig.attribute)
			: editor.innerText;
		if (placeholder && placeholder.includes(placeholderConfig.searchString)) {
			const newPlaceholder = replaceAll(
				placeholder,
				placeholderConfig.searchString,
				placeholderConfig.replaceString,
			);
			if (placeholderConfig.attribute) {
				editor.setAttribute(placeholderConfig.attribute, newPlaceholder);
			} else {
				editor.innerText = newPlaceholder;
			}
		}
	}

	function observePlaceholder() {
		const url = window.location.href;

		const placeholderConfig = [
			[
				"https://yuanbao.tencent.com",
				{
					attribute: "data-placeholder",
					selector: '.ql-editor[contenteditable="true"]',
					searchString: "shift+enter换行",
					replaceString: "Enter 换行，Ctrl+Enter 发送",
				},
			],
			[
				"https://yiyan.baidu.com",
				{
					attribute: null,
					selector: 'span[data-slate-placeholder="true"]',
					searchString: "通过shift+回车换行",
					replaceString: "通过回车换行，Ctrl+回车发送",
				},
			],
		].find(([site]) => url.startsWith(site))?.[1];

		if (!placeholderConfig) return;

		let observer;
		const setupObserver = () => {
			if (observer) {
				observer.disconnect();
			}
			observer = new MutationObserver(() => {
				fixPlaceholder(placeholderConfig);
			});

			const observeOptions = {
				childList: true,
				subtree: true,
				attributes: Boolean(placeholderConfig.attribute),
				characterData: !placeholderConfig.attribute,
			};
			if (placeholderConfig.attribute) {
				observeOptions.attributeFilter = [placeholderConfig.attribute];
			}
			observer.observe(document.body, observeOptions);
		};

		fixPlaceholder(placeholderConfig);
		setupObserver();
	}

	document.addEventListener("keydown", handleKeyDown, { capture: true });

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", observePlaceholder);
	} else {
		observePlaceholder();
	}

	console.log("✅ EnterIt 已加载");
})();
