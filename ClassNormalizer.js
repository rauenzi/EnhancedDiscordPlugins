const Plugin = require("../plugin");

const normalizedPrefix = "da";
const randClass = new RegExp(`^(?!${normalizedPrefix}-)((?:[A-Za-z]|[0-9]|-)+)-(?:[A-Za-z]|[0-9]|-|_){6}$`);
const modules = [];

module.exports = new Plugin({
    name: "ClassNormalizer",
    author: "Zerebos#7790",
    description: "Normalizes classes like channels-Ie2l6A by adding a version like da-channels.",

    load: async function() {
        if (this.hasPatched) return;
		modules.push(...EDApi.findAllModules(this.moduleFilter.bind(this)));
        this.patchClassModules(modules);
        this.normalizeElement(document.querySelector("#app-mount"));
        this.hasPatched = true;
		this.unpatch = EDApi.monkeyPatch(window, "findModule", {after: (data) => {
			if (!modules.includes(data.returnValue)) return;
			const newReturn = Object.assign({}, data.returnValue);
			this.unpatchClassModule(normalizedPrefix, newReturn)
			data.returnValue = newReturn;
		}});
    },

    unload: function() {
        if (!this.hasPatched) return;
		this.unpatch();
        this.unpatchClassModules(EDApi.findAllModules(this.moduleFilter.bind(this)));
        this.revertElement(document.querySelector("#app-mount"));
        this.hasPatched = false;
    },
	
	patchClassModules: function(modules) {
        for (const module of modules) {
            this.patchClassModule(normalizedPrefix, module);
        }
    },

    unpatchClassModules: function(modules) {
        for (const module of modules) {
            this.unpatchClassModule(normalizedPrefix, module);
        }
    },

    shouldIgnore: function(value) {
        if (!isNaN(value)) return true;
        if (value.endsWith("px") || value.endsWith("ch") || (value.endsWith("em") && !value.endsWith("tem")) || value.endsWith("ms")) return true;
        if (value.startsWith("#") && (value.length == 7 || value.length == 4)) return true;
        if (value.includes("calc(") || value.includes("rgba")) return true;
        return false;
    },

    moduleFilter: function(module) {
        if (typeof module !== "object" || Array.isArray(module)) return false;
        if (module.__esModule) return false;
        if (!Object.keys(module).length) return false;
        for (const baseClassName in module) {
            const value = module[baseClassName];
            if (typeof value !== "string") return false;
            if (this.shouldIgnore(value)) continue;
            if (value.split("-").length === 1) return false;
            if (!randClass.test(value.split(" ")[0])) return false;
        }

        return true;
    },

    patchClassModule: function(componentName, classNames) {
        for (const baseClassName in classNames) {
            const value = classNames[baseClassName];
            if (this.shouldIgnore(value)) continue;
            const classList = value.split(" ");
            for (const normalClass of classList) {
                const match = normalClass.match(randClass)[1];
                if (!match) continue; // Shouldn't ever happen since they passed the moduleFilter, but you never know
                const camelCase = match.split("-").map((s, i) => i ? s[0].toUpperCase() + s.slice(1) : s).join("");
                classNames[baseClassName] += ` ${componentName}-${camelCase}`;
            }
        }
    },

    unpatchClassModule: function(componentName, classNames) {
        for (const baseClassName in classNames) {
            const value = classNames[baseClassName];
            if (this.shouldIgnore(value)) continue;
            let newString = "";
            const classList = value.split(" ");
            for (const normalClass of classList) {
                if (normalClass.startsWith(`${componentName}-`)) continue;
                newString += ` ${normalClass}`;
            }
            classNames[baseClassName] = newString.trim();
        }
    },

    normalizeElement: function(element) {
        if (!(element instanceof Element)) return;
        const classes = element.classList;
        for (let c = 0, clen = classes.length; c < clen; c++) {
            if (!randClass.test(classes[c])) continue;
            const match = classes[c].match(randClass)[1];
            const newClass = match.split("-").map((s, i) => i ? s[0].toUpperCase() + s.slice(1) : s).join("");
            element.classList.add(`${normalizedPrefix}-${newClass}`);
        }
        for (const child of element.children) this.normalizeElement(child);
    },

    revertElement: function(element) {
        if (!(element instanceof Element)) return;
        if (element.children && element.children.length) this.revertElement(element.children[0]);
        if (element.nextElementSibling) this.revertElement(element.nextElementSibling);
        const classes = element.classList;
        const toRemove = [];
        for (let c = 0; c < classes.length; c++) {
            if (classes[c].startsWith(`${normalizedPrefix}-`)) toRemove.push(classes[c]);
        }
        element.classList.remove(...toRemove);
    }
});
