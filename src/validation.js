if (ko === undefined) {
    throw "The knockout JS library must be included before this validation library.";
}
ko.given = (function() {
    // User overridable settings
    settings = {
        subObservableNameIsValid: 'isValid',
        subObservableNameErrorMessages: 'errorMessages',
        defaultErrorMessage: 'This field is invalid'
    }
    
    // Fallback on native implementation of Object.create if available
    var objectCreate = (Object.create === 'function' ? Object.create : function(o) {
        function F() {}
        F.prototype = o;
        return new F();
    });
    
    function createRuleContext(obCtx, ruleFn) {
        var ruleCtx = {
            logicObservable: null, // set below
            observableContext: obCtx,
            customErrorMessage: null,
            condition: ko.observable(),
            
            withErrorMessage: function(msg) {
                this.customErrorMessage = msg;
                this.updateObservables();
            },
            
            when: function(condition) {
                this.condition(condition);
                this.updateObservables();
            },
            
            updateObservables: function(isValid) {
                if (isValid === undefined) {
                    isValid = this.logicObservable();
                }
                var errMsg = this.customErrorMessage || ko.given.settings.defaultErrorMessage;
            
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
            // Check for a condition
            var condition = ruleCtx.condition();
            if (typeof condition === 'function' && condition() == false) {
                return true;
            }
            return ruleFn(ruleCtx.observableContext.viewModelContext.viewModel); 
        });
        
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
                        ob[ko.given.settings.subObservableNameIsValid] = ob[ko.given.settings.subObservableNameIsValid] || ko.observable();
                        ob[ko.given.settings.subObservableNameErrorMessages] = ob[ko.given.settings.subObservableNameErrorMessages] || ko.observable();
                        return ob;
                    },
        
                    setValid: function (value) {
                        this.wrappedOb()[ko.given.settings.subObservableNameIsValid](value);
                    },
        
                    setErrMsg: function(value) {
                        this.wrappedOb(this.ob)[ko.given.settings.subObservableNameErrorMessages](value);
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
        
        // Subscribe to observable and initialize value
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
                throw new Error("The validateObservable method accepts only a single KO observable.");
            }    
        });
        
        var obCtx = {
            viewModelContext: vmCtx,
            observables: observables,
            rules: [],
            
            addRule: function(fn) {
                return createRuleContext(this, fn);
            }
        }
        
        return obCtx;
    }
    
    function createViewModelContext(viewModel) {
        var vmCtx = ko.utils.arrayFirst(ko.given.__givenVmContexts__, function(vmCtx) {
            return vmCtx.viewModel == viewModel;
        })
        if (vmCtx)
            return vmCtx;
        
        vmCtx = {
            viewModel: viewModel,
            validatedObservables: [],
            
            validateObservable: function(fn) {
                var ob = fn(this.viewModel);
                return createObservableContext(this, [ob]);
            },

            validateObservables: function(fn) {
                var obArray = fn(this.viewModel);
                return createObservableContext(this, obArray);
            },
            
            getRuleBinding: function(ob, ruleCtx) {
                return ko.utils.arrayFirst(this.validatedObservables, function(ruleBinding) {
                    return (
                        ruleBinding.ob == ob
                        && ko.utils.arrayIndexOf(ruleBinding.rules, ruleCtx) >= 0
                    );
                })
            },
            
            setRuleResultForObservable: function(ruleCtx, ob) {
                // 1. find the RB for each ob-rule binding
                // 2. decrement the remaining rule count
                // 3. set the valid state if count == 0
            }
        };
        ko.given.__givenVmContexts__.push(vmCtx);
        
        return vmCtx;
    }
    
    return {
        settings: settings,
        viewModel: function(viewModel){
            return createViewModelContext(viewModel);
        },
        __givenVmContexts__: []
    }; 

})();

/*
.givenViewModel(vm)
    .validateObservable[s](function(vm) {})
        .setRule([name | function(vm) {}])
            .when()
            .withErrorMessage(function (label) {})
            
            // used with named rules
            .withParams
            .with* (custom with param name)
            
    .formatObservable()
        .withFormatter(name)
*/