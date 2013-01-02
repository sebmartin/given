if (ko === undefined) {
    throw "The knockout JS library must be included before this validation library.";
}
var tko = (function() {

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