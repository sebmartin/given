describe("Validation:", function() {
	function createBasicViewModel() {
		return new (function() {
			this.firstName = ko.observable('');
			this.lastName = ko.observable('');
            this.email = ko.observable('');
            this.gender = ko.observable('');
            this.age = ko.observable(1);
		})();
	}
	
    describe("Custom settings", function() {
        var defaultSettings = {};
            
        beforeEach(function() {
            defaultSettings = ko.given.validation.settings;
            ko.given.validation.settings = {};
            for(setting in defaultSettings) {
                 ko.given.validation.settings[setting] = defaultSettings[setting];
            }
        });
            
        afterEach(function() {
            ko.given.validation.settings = defaultSettings;
        });
            
        it("should allow setting custom names of sub-observables", function() {
            var isValidName = '_isValid';
            var errMsgName = '_errMsg';
            ko.given.validation.settings.subObservableNameIsValid = isValidName;
            ko.given.validation.settings.subObservableNameErrorMessages = errMsgName;
                
            var vm = createBasicViewModel();
            
            ko.given.viewModel(vm)
                .validate(vm.firstName)
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName[isValidName]).toBeDefined();
            expect(vm.firstName[errMsgName]).toBeDefined();
        });
            
        it("should allow setting a new default error message", function() {
           var rudeErrMsg = 'This is plain wrong, you dummy!';
           ko.given.validation.settings.defaultErrorMessage = rudeErrMsg;
               
           var vm = createBasicViewModel();
            
           ko.given.viewModel(vm)
               .validate(vm.firstName)
                   .addRule(function(vm) {
                       return vm.firstName().length > 0;
                   });
               
           expect(vm.firstName.errorMessages()[0]).toEqual(rudeErrMsg);
        });
    });

    describe("A view model context", function() {
        it("should keep a reference to the VM", function() {
            var vm = createBasicViewModel();

            var vmCtx = ko.given.viewModel(vm);

            expect(vmCtx.viewModel).toBe(vm);
        });

        describe("with multiple observable contexts", function() {
            it("should always re-use existing view model contexts", function() {
                var vm = createBasicViewModel();
            
                var ruleCtx1 = 
                    ko.given.viewModel(vm)
                        .validate(vm.firstName)
                            .addRule(function(vm) { return false; });
                var ruleCtx2 = 
                    ko.given.viewModel(vm)
                        .validate(vm.firstName)
                            .addRule(function(vm) { return false; });
        
                expect(ruleCtx1.observableContext.viewModelContext).toBe(ruleCtx2.observableContext.viewModelContext);
            });

            it("should not reverse the validation state set by a previous rule", function() {
                var vm = createBasicViewModel();
                vm.firstName('Albert');
                vm.gender('F');
            
                ko.given.viewModel(vm)
                    .validate([ vm.firstName, vm.gender ])
                        .addRule(function(vm) {
                            return vm.firstName() == 'Albert' && vm.gender() == 'M';
                        });
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
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
            
            var vmCtx = ko.given.viewModel(vm);
            var obCtx = vmCtx.validate(vm.firstName);
            
            expect(obCtx.viewModelContext).toBe(vmCtx);
        });
        
        it("should allow specifying a single observable", function() {
            var vm = createBasicViewModel();
            
            var obCtx = ko.given.viewModel(vm).validate(vm.firstName);
            
            expect(obCtx.observables).toEqual([vm.firstName]);
        });
        
        it("should only accept a ko.observable objects", function() {
            var vm = createBasicViewModel();
            
            function act() {
                var obCtx = ko.given.viewModel(vm).validate("not an observable");                
            }
            
            expect(act).toThrow();
        });
        
        it("should allow specifying multiple observables", function() {
            var vm = createBasicViewModel();
            
            var obCtx = ko.given.viewModel(vm).validate([ vm.firstName, vm.lastName ]);
            
            expect(obCtx.observables).toEqual([vm.firstName, vm.lastName]);
        });

        it("should allow specifying a single observable by passing in a function", function() {
            var vm = createBasicViewModel();
            
            var obCtx = ko.given.viewModel(vm).validate(function(vm) { return vm.firstName; } );
            
            expect(obCtx.observables).toEqual([vm.firstName]);
        })

        it("should allow specifying a multiple observables by passing in a function", function() {
            var vm = createBasicViewModel();
            
            var obCtx = ko.given.viewModel(vm).validate(function(vm) { return [ vm.firstName, vm.lastName ]; } );
            
            expect(obCtx.observables).toEqual([vm.firstName, vm.lastName]);
        })
    });
    
    describe("A rule context", function() {
        it("should define isValid and errorMessage as sub-observables", function() {
            var vm = createBasicViewModel();
            
            ko.given.viewModel(vm)
                .validate(vm.firstName)
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName.isValid).toBeDefined();
            expect(vm.firstName.errorMessages).toBeDefined();
        });

        it("should properly initialize the isValid state when value is already valid", function() {
            var vm = createBasicViewModel();
            vm.firstName('Albert');
            
            ko.given.viewModel(vm)
                .validate(vm.firstName)
                .addRule(function(vm) {
                    return vm.firstName().length > 0;
                });
                
            expect(vm.firstName.isValid()).toBeTruthy();
        });
        
        it("should properly initialize the isValid state when value is already invalid", function() {
            var vm = createBasicViewModel();
            vm.firstName('');
            
            ko.given.viewModel(vm)
                .validate(vm.firstName)
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
            
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                    .addRule(function(vm) {
                        return vm.firstName().length > 0;
                    });
                
                expect(vm.firstName.isValid()).toBeFalsy();  // Should initialize to false
                vm.firstName('Albert');
                expect(vm.firstName.isValid()).toBeTruthy();
            });
        
            it("should allow setting an error message", function(vm) {
                var vm = createBasicViewModel();
                var message = 'CUSTOM ERROR';
            
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                    .addRule(function(vm) {
                        return false;
                    })
                    .withErrorMessage(message);
            
                expect(vm.firstName.errorMessages()[0]).toEqual(message);
            });
            
            describe("and a condition", function() {
                it("should always be valid when the condition fails", function() {
                    var vm = createBasicViewModel();
            
                    ko.given.viewModel(vm)
                        .validate(vm.firstName)
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return false; });
            
                    expect(vm.firstName.isValid()).toBeTruthy();
                });
            
                it("should be executed when the condition passes", function() {
                    var vm = createBasicViewModel();
            
                    ko.given.viewModel(vm)
                        .validate(vm.firstName)
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
            
                ko.given.viewModel(vm)
                    .validate([ vm.firstName, vm.lastName ])
                    .addRule(function(vm) {
                        return true;
                    });
                
                expect(vm.firstName.isValid()).toBeTruthy();
                expect(vm.lastName.isValid()).toBeTruthy();
            });
        
            it("should set the initial validity state of each selected observable when validating two (invalid) observables", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                ko.given.viewModel(vm)
                    .validate([ vm.firstName, vm.lastName ])
                    .addRule(function(vm) {
                        return false;
                    });
                
                expect(vm.firstName.isValid()).toBeFalsy();
                expect(vm.lastName.isValid()).toBeFalsy();
            });
        
            it("should update the validity state of each observable", function() {
                var vm = createBasicViewModel();
                vm.firstName('');
            
                ko.given.viewModel(vm)
                    .validate([ vm.firstName, vm.lastName ])
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
            
                ko.given.viewModel(vm)
                    .validate([ vm.firstName, vm.lastName ])
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
            
                    ko.given.viewModel(vm)
                        .validate([ vm.firstName, vm.lastName ])
                            .addRule(function(vm) {
                                return false;
                            })
                            .when(function(vm) { return false; });
            
                    expect(vm.firstName.isValid()).toBeTruthy();            
                    expect(vm.lastName.isValid()).toBeTruthy();
                });
            
                it("should be executed when the condition passes", function() {
                    var vm = createBasicViewModel();
            
                    ko.given.viewModel(vm)
                        .validate([ vm.firstName, vm.lastName ])
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
    
    describe("A named validation rule", function() {
        describe("for email", function() {
            it("should validate for a valid email", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.email)
                        .addRule("email");

                vm.email('jsmith@johnny.com');
                expect(vm.email.isValid()).toBeTruthy();
                vm.email('j.smith+tag@johnny.com');
                expect(vm.email.isValid()).toBeTruthy();
            });

            it("should invalidate for an invalid emails", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.email)
                        .addRule("email");

                vm.email('t@t.');
                expect(vm.email.isValid()).toBeFalsy();
                vm.email('test@test');
                expect(vm.email.isValid()).toBeFalsy();
                vm.email('test@.test');
                expect(vm.email.isValid()).toBeFalsy();
                vm.email('@test.test');
                expect(vm.email.isValid()).toBeFalsy();
                vm.email('test@');
                expect(vm.email.isValid()).toBeFalsy();
            });
        });

        describe("for minimums", function() {
            it("should validate when parameter is greater than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("min", 10);

                vm.age(11);
                expect(vm.age.isValid()).toBeTruthy();
            });

            it("should validate when parameter is equal to threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("min", 10);

                vm.age(10);
                expect(vm.age.isValid()).toBeTruthy();
            });

            it("should invalidate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("min", 10);

                vm.age(9);

                expect(vm.age.isValid()).toBeFalsy();
            });
        });

        describe("for minimum string lengths", function() {
            it("should validate when parameter is greater than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("minLength", 3);

                vm.firstName("Steve");
                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should validate when parameter is equal to threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("minLength", 3);

                vm.firstName("Ali");
                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should invalidate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("minLength", 3);

                vm.firstName("Al");

                expect(vm.firstName.isValid()).toBeFalsy();
            });
        })

        describe("for maximums", function() {
            it("should validate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("max", 10);

                vm.age(9);
                expect(vm.age.isValid()).toBeTruthy();
            });

            it("should validate when parameter is equal to threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("max", 10);

                vm.age(10);
                expect(vm.age.isValid()).toBeTruthy();
            });

            it("should invalidate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.age)
                        .addRule("max", 10);

                vm.age(11);

                expect(vm.age.isValid()).toBeFalsy();
            });
        });

        describe("for maximum string lengths", function() {
            it("should validate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("maxLength", 3);

                vm.firstName("Al");
                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should validate when parameter is equal to threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("maxLength", 3);

                vm.firstName("Ali");
                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should invalidate when parameter is less than threshold", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("maxLength", 3);

                vm.firstName("Steve");

                expect(vm.firstName.isValid()).toBeFalsy();
            });
        })

        describe("for regular expression patterns", function() {
            it("should validate when pattern matches", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("expression", /[0-9]{3}/);

                vm.firstName("123");
                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should invalidate when pattern does not match", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("expression", /[0-9]{3}/);

                vm.firstName("1a3");
                expect(vm.firstName.isValid()).toBeFalsy();
            });

            it("should validate when string pattern patches", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("expression", "[0-9]{3}");

                vm.firstName("123");
                expect(vm.firstName.isValid()).toBeTruthy();
            })

            it("should invalidate when string pattern does not patch", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("expression", "[0-9]{3}");

                vm.firstName("12");
                expect(vm.firstName.isValid()).toBeFalsy();
            })
        });

        describe("custom named rules", function() {
            var ruleName = "steve";
            var ruleFunction;

            beforeEach(function() {
                ruleFunction = function(vm, observable) {
                    return observable() == "Steve";
                };
                ko.given.validation.clearNamedRules();
                ko.given.validation.addNamedRule(ruleName, ruleFunction);
            });

            it("should validate when valid", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule(ruleName);

                vm.firstName("Steve");

                expect(vm.firstName.isValid()).toBeTruthy();
            });

            it("should invalidate when invalid", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule(ruleName);

                vm.firstName("Not Steve");

                expect(vm.firstName.isValid()).toBeFalsy();
            });

            it("should invalidate all observables if one is invalid", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate([vm.firstName, vm.lastName])
                        .addRule(ruleName);

                vm.firstName("Steve");
                vm.lastName("Not Steve");

                expect(vm.firstName.isValid()).toBeFalsy();
                expect(vm.lastName.isValid()).toBeFalsy();
            });

            it("should invalidate all observables if they are all invalid", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate([vm.firstName, vm.lastName])
                        .addRule(ruleName);

                vm.firstName("Not Steve");
                vm.lastName("Not Steve");

                expect(vm.firstName.isValid()).toBeFalsy();
                expect(vm.lastName.isValid()).toBeFalsy();
            });

            it("should validate all observables if they are all valid", function() {
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate([vm.firstName, vm.lastName])
                        .addRule(ruleName);

                vm.firstName("Steve");
                vm.lastName("Steve");

                expect(vm.firstName.isValid()).toBeTruthy();
                expect(vm.lastName.isValid()).toBeTruthy();
            });

            it("should accept a variable number of parameters", function() {
                var args = [10, 20, 30, 40, 50];
                var receivedArgs = [];
                ko.given.validation.addNamedRule("ascending", function(vm, observable, a1, a2, a3, a4, a5) {
                    receivedArgs = arguments;
                    return true;
                })
                var vm = createBasicViewModel();
                ko.given.viewModel(vm)
                    .validate(vm.firstName)
                        .addRule("ascending", args[0], args[1], args[2], args[3], args[4]);

                vm.firstName("Steve");

                var same = true;
                for (var i = 0; i < args.length; i++) {
                    if (args[i] != receivedArgs[i+2]) {
                        same = false;
                        break;
                    }
                }

                expect(same).toBeTruthy();;
            });
        });
    });
});
