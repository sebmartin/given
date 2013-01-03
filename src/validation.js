if (ko === undefined) {
    throw "The knockout JS library must be included before this validation library.";
}
var tko = (function() {
    // User overridable settings
    settings = {
        subObservableNameIsValid: 'isValid',
        subObservableNameErrorMessage: 'errorMessage',
        defaultErrorMessage: 'This field is invalid'
    }
    
    // Fallback on native implementation of Object.create if available
    var objectCreate = (Object.create === 'function' ? Object.create : function(o) {
        function F() {}
        F.prototype = o;
        return new F();
    });
    
    function trackRuleObservable(ob, ruleCtx) {
        console.log('Tracking observable:' + ob.tag);
        
        function createBinding(ob) {
            return {
                ob: ob,
                rules: [],
                onBeforeChange: function() {
                    console.log('beforeChange');
                    console.log(this);
                },
                onAfterChange: function() {
                    console.log('afterChange');
                    console.log(this);
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
            ob.subscribe(binding.onAfterChange, binding, 'afterChange');
        }
        binding.rules.push(ruleCtx);
    }
    function trackRuleObservables(observables, ruleCtx) {
        ko.utils.arrayForEach(observables, function(ob) {
            trackRuleObservable(ob, ruleCtx);
        })
    }
    
    function createRuleContext(obCtx, ruleFn) {
        var ruleCtx = {
            observableContext: obCtx, 
             
            when: function(condition) {
                
            },
            withErrorMessage: function(msg) {
                
            },
            withParams: function(params) {
                
            }
        };
        
        // Call the rule within a computed observable to capture all of the
        // dependencies
        ruleCtx.ruleObservable = ko.computed(function() {
            // - Returns true if valid, false otherwise
            return ruleFn(ruleCtx.observableContext.viewModelContext.viewModel); 
        });
        
        function wrapOb (ob) {
            ob[tko.settings.subObservableNameIsValid] = ob[tko.settings.subObservableNameIsValid] || ko.observable();
            ob[tko.settings.subObservableNameErrorMessage] = ob[tko.settings.subObservableNameErrorMessage] || ko.observable();
            return ob;
        }
        
        function setValid (ob, value) {
            wrapOb(ob)[tko.settings.subObservableNameIsValid](value);
        }
        
        function setErrMsg(ob, value) {
            wrapOb(ob)[tko.settings.subObservableNameErrorMessage](value);
        }
        
        // Called when the 'isValid' status changes
        function onValidStateChanged (isValid) {
            var errMsg = tko.settings.defaultErrorMessage;
            
            // TODO: figure out the error message, if any
            
            // Update each observable linked to the rule
            ko.utils.arrayForEach(obCtx.observables, function(ob) {
                setValid(ob, isValid);
                setErrMsg(ob, errMsg);
            });
        }
        // Subscribe to observable and initialize value
        ruleCtx.ruleObservable.subscribe(onValidStateChanged);
        onValidStateChanged(ruleCtx.ruleObservable());
        
        trackRuleObservables(obCtx.observables, ruleCtx);
        
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
        var vmCtx = ko.utils.arrayFirst(tko.__givenVmContexts__, function(vmCtx) {
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
        };
        tko.__givenVmContexts__.push(vmCtx);
        
        return vmCtx;
    }
    
    return {
        settings: settings,
        givenViewModel: function(viewModel){
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