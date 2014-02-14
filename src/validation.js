if (ko === undefined) {
    throw "The knockout JS library must be included before this validation library.";
}
ko.given = (function() {
    'use strict';
    
    // High level validation functionality
    var validation = {
        // User overridable settings
        settings: {
            subObservableNameIsValid: 'isValid',
            subObservableNameErrorMessages: 'errorMessages',
            defaultErrorMessage: 'This field is invalid'
        },

        namedRules: {},

        addNamedRule: function(name, fn) {
            this.namedRules[name] = fn;
        },

        clearNamedRules: function() {
            this.namedRules = {};
        }
    }
    
    // Fallback on native implementation of Object.create if not available
    var objectCreate = (Object.create === 'function' ? Object.create : function(o) {
        function F() {}
        F.prototype = o;
        return new F();
    });

    // Use ES5 method if it exists, fallback if it doesn't.  Note that the fallback does not work if 
    // array is created in another frame.
    var isArray = Array.isArray || function(arr) { return arr instanceof Array; }  
    
    function createRuleContext(obCtx, ruleFn) {
        var ruleCtx = {
            logicObservable: null, // set below
            observableContext: obCtx,
            customErrorMessage: null,
            condition: ko.observable(),
            
            // Specify an error message for a given rule
            withErrorMessage: function(msg) {
                this.customErrorMessage = msg;
                this.updateObservables();
            },
            
            // Specify a condition for the rule.  The rule will only be executed when this
            // is satisfied.
            when: function(condition) {
                this.condition(condition);
                this.updateObservables();
            },
            
            // Used to set the validity of an observable
            updateObservables: function(isValid) {
                if (isValid === undefined) {
                    isValid = this.logicObservable();
                }
                var errMsg = this.customErrorMessage || ko.given.validation.settings.defaultErrorMessage;
            
                // Update each observable linked to the rule
                var ruleCtx = this;
                ko.utils.arrayForEach(this.observableContext.observables, function(ob) {
                    var vmCtx = ruleCtx.observableContext.viewModelContext;
                    var ruleBinding = vmCtx.getRuleBinding(ob, ruleCtx);
                    ruleBinding.setObservableValidity(isValid, errMsg);
                });
            }
        };
        
        // Call the rule within a computed observable to capture all of the dependencies
        // - Returns true if valid, false otherwise
        ruleCtx.logicObservable = ko.computed(function() {
            // Rules can be active/inactive based on a condition specified by when()
            var condition = ruleCtx.condition();
            if (typeof condition === 'function' && condition() == false) {
                return true;
            }
            return ruleFn(ruleCtx.observableContext.viewModelContext.viewModel);
        });
        
        // Track rule <-> observable bindings.  This is necessary for cases where one observable is validated
        // by more than one rule.  If the first rule sets it to invalid but the second sets it to valid, we need
        // to make sure that the observable is still set to invalid, regardless of rules' execution order.
        function trackRuleObservable(ob, ruleCtx) {
            function createBinding(ob) {
                return {
                    ob: ob,
                    rules: [],
                    rulesExecuting: 0,
                    onBeforeChange: function() {
                        // Keep track of how many rules are executing so that we only update the
                        // validity once; on the last rule.
                        this.rulesExecuting = this.rules.length;
                    },
                    setObservableValidity: function(isValid, errorMessage) {
                        this.rulesExecuting -= 1;
                        if (this.rulesExecuting <= 0) {
                            this.rulesExecuting = 0;
                            var isValid = true;
                            var errMessages = [];
                            for (var i=0; i < this.rules.length; i++) {
                                var rule = this.rules[i];
                                if (rule.logicObservable() == false) {
                                    isValid = false;
                                    errMessages.push(errorMessage);
                                    break;
                                }
                            }
                            
                            this.setValid(isValid);
                            this.setErrMsg(errMessages);
                        }
                    },

                    wrappedOb: function() {
                        var ob = this.ob;
                        ob[ko.given.validation.settings.subObservableNameIsValid] = ob[ko.given.validation.settings.subObservableNameIsValid] || ko.observable();
                        ob[ko.given.validation.settings.subObservableNameErrorMessages] = ob[ko.given.validation.settings.subObservableNameErrorMessages] || ko.observable();
                        return ob;
                    },
        
                    setValid: function (value) {
                        this.wrappedOb()[ko.given.validation.settings.subObservableNameIsValid](value);
                    },
        
                    setErrMsg: function(value) {
                        this.wrappedOb(this.ob)[ko.given.validation.settings.subObservableNameErrorMessages](value);
                    }
                };            
            }
        
            // Fetch an existing observable binding from the view model context, or add a new one 
            var vmCtx = ruleCtx.observableContext.viewModelContext;
            var binding = ko.utils.arrayFirst(vmCtx.validatedObservables, function(binding) {
                return binding.ob == ob;
            });
            if (binding == null) {
                binding = createBinding(ob);
                vmCtx.validatedObservables.push(binding);
                ob.subscribe(binding.onBeforeChange, binding, 'beforeChange');
            }
            binding.rules.push(ruleCtx);
        }
        function trackRuleObservables(observables, ruleCtx) {
            ko.utils.arrayForEach(observables, function(ob) {
                trackRuleObservable(ob, ruleCtx);
            })
        }
        trackRuleObservables(obCtx.observables, ruleCtx);
        
        // Subscribe to logic observable to update the observables when its value changes and initialize initial value
        ruleCtx.logicObservable.subscribe(ruleCtx.updateObservables, ruleCtx);
        ruleCtx.updateObservables(ruleCtx.logicObservable());
        
        return ruleCtx;
    };
    
    function createObservableContext(vmCtx, observables) {
        // wrap observables into an array if not one already
        if ((observables instanceof Array) == false) {
            observables = [observables];
        }
        
        // verify that all members of the array are observables
        ko.utils.arrayForEach(observables, function(ob) {
            if (ko.isObservable(ob) == false) {
                throw new Error("Invalid Knockout Observabe.  Cannot create observable context with parameter: " + ob);
            }    
        });
        
        var obCtx = {
            viewModelContext: vmCtx,
            observables: observables,
            rules: [],
            
            addRule: function(/* function || [name, args...] */) {
                // Wrap the rule function so that it calls it once per observable in the context
                // (instead of having the named rules worry about the multi-observable scenario)
                var that = this;
                var ruleArguments = arguments;
                var namedRuleWrapper = function(vm) {
                    var ruleName = ruleArguments[0];
                    var fn = ko.given.validation.namedRules[ruleName];
                    if (fn === undefined) {
                        throw new Error("Could not find a validation rule named '" + ruleName + "'");
                    }
                    // Fail the rule for all observables (in context) if at least one of them fails
                    for (var i = that.observables.length - 1; i >= 0; i--) {
                        var ob = that.observables[i];
                        // Arguments for rule function are (vm, observable, ruleArg1, ruleArg2, ...)
                        var args = [vm,ob].concat([].slice.call(ruleArguments, 1));
                        if (!fn.apply(null, args))
                            return false;
                    };
                    return true;
                }

                // If first argument is a string, we're using a named rule
                var fn = (typeof arguments[0] !== "string" ? 
                        arguments[0] : 
                        namedRuleWrapper
                    );
                return createRuleContext(this, fn);
            }
        }
        
        return obCtx;
    }
    
    function createViewModelContext(viewModel) {
        // Return an existing context for the given viewModel if one exists
        var vmCtx = ko.utils.arrayFirst(ko.given.__givenVmContexts__, function(vmCtx) {
            return vmCtx.viewModel == viewModel;
        })
        if (vmCtx)
            return vmCtx;
        
        // .. else, create a new one
        vmCtx = {
            viewModel: viewModel,
            validatedObservables: [],
            
            // Accepts an single observable or an array of observables
            validate: function(ob) {
                // If user passed in a function, evalutate it immediately
                if ((ko.isObservable(ob) == false) && 
                    isArray(ob) == false &&
                    typeof ob === "function") 
                {
                    ob = ob(viewModel);
                }
                return createObservableContext(this, ob);
            },
            
            getRuleBinding: function(ob, ruleCtx) {
                return ko.utils.arrayFirst(this.validatedObservables, function(ruleBinding) {
                    return (
                        ruleBinding.ob == ob
                        && ko.utils.arrayIndexOf(ruleBinding.rules, ruleCtx) >= 0
                    );
                })
            },
        };
        ko.given.__givenVmContexts__.push(vmCtx);
        
        return vmCtx;
    }
    
    return {
        validation: validation,
        viewModel: function(viewModel){
            return createViewModelContext(viewModel);
        },
        __givenVmContexts__: []
    };

})();