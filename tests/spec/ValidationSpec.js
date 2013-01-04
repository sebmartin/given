describe("Validation:", function() {
	function createBasicViewModel() {
		return new (function() {
			this.firstName = ko.observable('');
			this.lastName = ko.observable('');
            this.email = ko.observable('');
            this.gender = ko.observable('');
		})();
	}
	
    describe("Custom settings", function() {
        var defaultSettings = {};
            
        beforeEach(function() {
            defaultSettings = tko.settings;
            tko.settings = {};
            for(setting in defaultSettings) {
                 tko.settings[setting] = defaultSettings[setting];
            }
        });
            
        afterEach(function() {
            tko.settings = defaultSettings;
        });
            
        it("should allow setting custom names of sub-observables", function() {
            var isValidName = '_isValid';
            var errMsgName = '_errMsg';
            tko.settings.subObservableNameIsValid = isValidName;
            tko.settings.subObservableNameErrorMessages = errMsgName;
                
            var vm = createBasicViewModel();
            
            tko.givenViewModel(vm)
                .validateObservable(function() { return vm.firstName; })
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName[isValidName]).toBeDefined();
            expect(vm.firstName[errMsgName]).toBeDefined();
        });
            
        it("should allow setting a new default error message", function() {
           var rudeErrMsg = 'This is plain wrong, you dummy!';
           tko.settings.defaultErrorMessage = rudeErrMsg;
               
           var vm = createBasicViewModel();
            
           tko.givenViewModel(vm)
               .validateObservable(function() { return vm.firstName; })
               .addRule(function(vm) {
                   return vm.firstName().length > 0;
               });
               
           expect(vm.firstName.errorMessages()[0]).toEqual(rudeErrMsg);
        });
    });
    
	describe("A view model context", function() {
		it("should keep a reference to the VM", function() {
			var vm = createBasicViewModel();
			
			var vmCtx = tko.givenViewModel(vm);
			
			expect(vmCtx.viewModel).toBe(vm);
		});
        
        describe("with multiple observable contexts", function() {
            it("should always re-use existing view model contexts", function() {
                var vm = createBasicViewModel();
            
                var ruleCtx1 = 
                    tko.givenViewModel(vm)
                        .validateObservable(function() { return vm.firstName; })
                            .addRule(function(vm) { return false; });
                var ruleCtx2 = 
                    tko.givenViewModel(vm)
                        .validateObservable(function() { return vm.firstName; })
                            .addRule(function(vm) { return false; });
        
                expect(ruleCtx1.observableContext.viewModelContext).toBe(ruleCtx2.observableContext.viewModelContext);
            });

            it("should not reverse the validation state set by a previous rule", function() {
                var vm = createBasicViewModel();
                vm.firstName('Albert');
                vm.gender('F');
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return [ vm.firstName, vm.gender ]; 
                    })
                        .addRule(function(vm) {
                            return vm.firstName() == 'Albert' && vm.gender() == 'M';
                        });
                tko.givenViewModel(vm)
                    .validateObservable(function() { return vm.firstName; })
                        .addRule(function(vm) {
                            return vm.firstName() != '';
                        });
            
                vm.firstName('Steve');
                   
                expect(vm.firstName.isValid()).toBeFalsy();
                expect(vm.gender.isValid()).toBeFalsy();
            });
        });
	});
    
    describe("An observable context", function() {
        it("should retain a reference to the view model context", function() {
            var vm = createBasicViewModel();
            
            var vmCtx = tko.givenViewModel(vm);
            var obCtx = vmCtx.validateObservable(function(vm) {
                return vm.firstName;
            });
            
            expect(obCtx.viewModelContext).toBe(vmCtx);
        });
        
        it("should allow specifying a single observable using the singular method", function() {
            var vm = createBasicViewModel();
            
            var obCtx = tko.givenViewModel(vm).validateObservable(function(vm) {
                return vm.firstName;
            });
            
            expect(obCtx.observables).toEqual([vm.firstName]);
        });
        
        it("should only accept a single ko.observable from the singular method", function() {
            var vm = createBasicViewModel();
                    
            function act() {
                var obCtx = tko.givenViewModel(vm).validateObservable(function(vm) {
                    return [vm.firstName, vm.lastName];
                });
            }
            
            expect(act).toThrow();
        });
        
        it("should only accept a ko.observable objects", function() {
            var vm = createBasicViewModel();
            
            function act() {
                var obCtx = tko.givenViewModel(vm).validateObservable(function(vm) {
                    return "not an observable";
                });                
            }
            
            expect(act).toThrow();
        });
        
        it("should allow specifying multiple observables using the plural method", function() {
            var vm = createBasicViewModel();
            
            var obCtx = tko.givenViewModel(vm).validateObservables(function(vm) {
                return [vm.firstName, vm.lastName];
            });
            
            expect(obCtx.observables).toEqual([vm.firstName, vm.lastName]);
        });
    });
    
    describe("A rule context", function() {
        it("should define isValid and errorMessage as sub-observables", function() {
            var vm = createBasicViewModel();
            
            tko.givenViewModel(vm)
                .validateObservable(function() { return vm.firstName; })
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName.isValid).toBeDefined();
            expect(vm.firstName.errorMessages).toBeDefined();
        });

        it("should properly initialize the isValid state when value is already valid", function() {
            var vm = createBasicViewModel();
            vm.firstName('Albert');
            
            tko.givenViewModel(vm)
                .validateObservable(function() { return vm.firstName; })
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName.isValid()).toBeTruthy();
        });
        
        it("should properly initialize the isValid state when value is already invalid", function() {
            var vm = createBasicViewModel();
            vm.firstName('');
            
            tko.givenViewModel(vm)
                .validateObservable(function() { return vm.firstName; })
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName.isValid()).toBeFalsy();
        });
    });
    
    describe("A validation rule", function() {
        
        describe("with one observable", function() {
        
            it("should update the observable's validity state", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                tko.givenViewModel(vm)
                    .validateObservable(function() { return vm.firstName; })
                    .addRule(function(vm) {
                        return vm.firstName().length > 0;
                    });
                
                expect(vm.firstName.isValid()).toBeFalsy();  // Should initialize to false
                vm.firstName('Albert');
                expect(vm.firstName.isValid()).toBeTruthy();
            });
        
            it("should allow setting an error message", function() {
                var vm = createBasicViewModel();
                var message = 'CUSTOM ERROR';
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return vm.firstName;
                    })
                    .addRule(function(vm) {
                        return false;
                    })
                    .withErrorMessage(message);
            
                expect(vm.firstName.errorMessages()[0]).toEqual(message);
            });
            
            describe("and a condition", function() {
                it("should always be valid when the condition fails", function() {
                    var vm = createBasicViewModel();
            
                    tko.givenViewModel(vm)
                        .validateObservable(function() { return vm.firstName; })
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return false; });
            
                    expect(vm.firstName.isValid()).toBeTruthy();
                });
            
                it("should be executed when the condition passes", function() {
                    var vm = createBasicViewModel();
            
                    tko.givenViewModel(vm)
                        .validateObservable(function() { return vm.firstName; })
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return true; });
            
                    expect(vm.firstName.isValid()).toBeFalsy();
                });
            });
        });
       
        describe("with more than one observable", function() {
            it("should set the initial validity state of each selected observable when validating two (valid) observables", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return [ vm.firstName, vm.lastName ]; })
                    .addRule(function(vm) {
                        return true;
                    });
                
                expect(vm.firstName.isValid()).toBeTruthy();
                expect(vm.lastName.isValid()).toBeTruthy();
            });
        
            it("should set the initial validity state of each selected observable when validating two (invalid) observables", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return [ vm.firstName, vm.lastName ]; })
                    .addRule(function(vm) {
                        return false;
                    });
                
                expect(vm.firstName.isValid()).toBeFalsy();
                expect(vm.lastName.isValid()).toBeFalsy();
            });
        
            it("should update the validity state of each observable", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return [ vm.firstName, vm.lastName ]; 
                    })
                    .addRule(function(vm) {
                        return vm.firstName().length > 0;
                    });
                
                expect(vm.firstName.isValid()).toBeFalsy();  // Should initialize to false
                expect(vm.lastName.isValid()).toBeFalsy();  // Should initialize to false
                vm.firstName('Albert');
                expect(vm.firstName.isValid()).toBeTruthy();
                expect(vm.lastName.isValid()).toBeTruthy();
            });
        
            it("should allow setting an error message for more than one observable", function() {
                var vm = createBasicViewModel();
                var message = 'CUSTOM ERROR';
            
                tko.givenViewModel(vm)
                    .validateObservables(function() { 
                        return [ vm.firstName, vm.lastName ]; 
                    })
                        .addRule(function(vm) {
                            return false;
                        })
                        .withErrorMessage(message);
            
                expect(vm.firstName.errorMessages()[0]).toEqual(message);
                expect(vm.lastName.errorMessages()[0]).toEqual(message);
            });
            
            describe("and a condition", function() {
                it("should always be valid when the condition fails", function() {
                    var vm = createBasicViewModel();
            
                    tko.givenViewModel(vm)
                        .validateObservables(function() { 
                            return [ vm.firstName, vm.lastName ]; 
                        })
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return false; });
            
                    expect(vm.firstName.isValid()).toBeTruthy();            
                    expect(vm.lastName.isValid()).toBeTruthy();
                });
            
                it("should be executed when the condition passes", function() {
                    var vm = createBasicViewModel();
            
                    tko.givenViewModel(vm)
                        .validateObservables(function() { 
                            return [ vm.firstName, vm.lastName ]; 
                        })
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return true; });
            
                    expect(vm.firstName.isValid()).toBeFalsy();
                    expect(vm.lastName.isValid()).toBeFalsy();
                });
            });
        });
    });
});
