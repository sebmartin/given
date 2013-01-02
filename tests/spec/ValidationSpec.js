describe("A validation rule", function() {
	function createBasicViewModel() {
		return new (function() {
			this.firstName = ko.observable();
			this.lastName = ko.observable();
		})();
	}
	
	describe("when specifying a view model", function() {
		it("should keep a reference to the VM", function() {
			var vm = createBasicViewModel();
			
			var vmCtx = tko.givenViewModel(vm);
			
			expect(vmCtx.viewModel).toBe(vm);
		});
	});
    
    describe("when specifying observable(s) to validate", function() {
        it("should allow specifying a single observable using the singular method", function() {
            var vm = createBasicViewModel();
            
            var vmCtx = tko.givenViewModel(vm);
            var obCtx = vmCtx.validateObservable(function(vm) {
                return vm.firstName;
            });
            
            expect(obCtx.observables).toEqual([vm.firstName]);
        });
        
        it("should only accept a single ko.observable from the singular method", function() {
            var vm = createBasicViewModel();
                    
            function act() {
                var vmCtx = tko.givenViewModel(vm);
                var obCtx = vmCtx.validateObservable(function(vm) {
                    return [vm.firstName, vm.lastName];
                });
            }
            
            expect(act).toThrow();
        });
        
        it("should only accept a ko.observable objects", function() {
            var vm = createBasicViewModel();
            
            function act() {
                var vmCtx = tko.givenViewModel(vm);
                var obCtx = vmCtx.validateObservable(function(vm) {
                    return "not an observable";
                });                
            }
            
            expect(act).toThrow();
        });
        
        it("should allow specifying multiple observables using the plural method", function() {
            var vm = createBasicViewModel();
            
            var vmCtx = tko.givenViewModel(vm);
            var obCtx = vmCtx.validateObservables(function(vm) {
                return [vm.firstName, vm.lastName];
            });
            
            expect(obCtx.observables).toEqual([vm.firstName, vm.lastName]);
        });
    })
});
