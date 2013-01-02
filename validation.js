if (ko === undefined) {
    throw "The knockout JS library must be included before this validation library.";
}
var tko = (function() {
    // Fallback on native implementation of Object.create if available
    var objectCreate = (Object.create === 'function' ? Object.create : function(o) {
        function F() {}
        F.prototype = o;
        return new F();
    });
    
    var RootObject = {};
    
    function createObservableContext(vmCtx, observables) {
        // wrap observables into an array if not one already
        if ((observables instanceof Array) == false) {
            observables = [observables];
        }
        
        // verify that all members of the array are observables
        ko.utils.arrayForEach(observables, function(ob) {
            if (ko.isObservable(ob) == false) {
                throw new Error("validateObservable accepts only a single KO observable.");
            }    
        });
        
        var obCtx = {
            viewModelContext: vmCtx,
            observables: observables
        }
        
        return obCtx;
    }
    
    function createViewModelContext(viewModel) {
        var vmCtx = {
            viewModel: viewModel,
            
            validateObservable: function(fn) {
                var ob = fn(this.viewModel);
                return createObservableContext(this, [ob]);
            },

            validateObservables: function(fn) {
                var obArray = fn(this.viewModel);
                return createObservableContext(this, obArray);
            }
        };
        
        return vmCtx;
    }
    
    return {
        givenViewModel: function(viewModel){
            return createViewModelContext(viewModel);
        }
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