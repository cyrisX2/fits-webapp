'use strict';

angular.module('tcl').filter('reportF', function() {
    return function(input, f) {
    	 if (!input || !input.length) { return; }
    	 return input.filter(function(elm){
    		 return elm._events.crt >= f.ev.crt && elm._events.cmp >= f.ev.cmp && elm._fc.crt >= f.fc.crt && elm._fc.cmp >= f.fc.cmp;
    	 })
    }
});

/**
 * @ngdoc function
 * @name clientApp.controller:ExecutionCtrl
 * @description
 * # ExecutionCtrl
 * Controller of the clientApp
 */
angular.module('tcl').controller('ExecutionCtrl', function($filter,$rootScope, $scope, VaccineService, $http, TestDataService, $timeout, ngTreetableParams, $q) {
  $scope.tps = [];
  $scope.selectedTC = null;
  $scope.selectedTP = null;
  $scope.tcQueue = [];
  $scope.exec = false;
  $scope.addConfig = false;
  $scope.configs = [];
  $scope.qview = true;
  $scope.filter = {
		  ev : {
			  cmp : 0,
			  crt : 0
		  },
		  fc : {
			  cmp : 0,
			  crt : 0  
		  }
  };
  $scope.configStub = {
    name: "",
    endPoint: "",
    connector: ""
  };
  $scope.loadConfig = function() {
    $http.get("api/exec/configs").then(function(result) {
      $scope.configs = angular.fromJson(result.data);
    });
  };
  $scope.loadVaccines = function() {
    var d = $q.defer();
    VaccineService.load().then(function(data) {
      for (var k in data) {
        if (data.hasOwnProperty(k))
          $scope[k] = data[k];
      }
      d.resolve(true);
      console.log("VX");
      console.log($scope.vxm);
    },
      function(err) {
        console.log(err);
        d.resolve(false);
      });
    return d.promise;
  };
  $scope.saveConfig = function() {
    $http.post("api/exec/configs/save", $scope.configStub).then(function(result) {
      $scope.loadConfig();
    });
  };
  $rootScope.$on('event:loginConfirmed', function() {
    $scope.init();
  });
  $scope.selectedConfig = null;
  $scope.heigth = {
    'heigth': '100%'
  };
  $scope.tabStyle = $scope.heigth;
  $scope.init = function() {
    $scope.loadConfig();
    $scope.loadTestCases();
    $scope.loadVaccines();
  };
  $scope.dstartf = false;
  $scope.dstart = function(a) {
    $scope.dstartf = a;
  };
  $scope.multipleSel = false;
  $scope.selected = [];

  $scope.reset = function(n){
	n.cmp = 0;
	n.crt = 0;
  };
  
  $scope.back = function(){
	  $scope.exec = false;
	  $scope.rp = 0;
	  $scope.showResults = false;
	  $scope.report = {};
	  $scope.aggregate = {};
	  $scope.running = false;
	  $scope.executed = 0;
	  $scope.all = 0;
	  $scope.progress = 0;
	  $scope.tcQueue = [];
  };
  
  $scope.multiToggle = function() {
    $scope.multipleSel = !$scope.multipleSel;
    $scope.selected = [];
  };
  $scope.select = function(tc) {
    var x = $scope.selected.find(function(item) {
      return item.id === tc.id;
    });
    if (x) {
      $scope.selected = $scope.selected.filter(function(item) {
        return item.id != x.id;
      })
    } else {
      $scope.selected.push(tc);
    }
  };

  $scope.find = function(list, o) {
    return list.find(function(item) {
      return item.id === o.id;
    });
  };

  $scope.drop = function(list, items, index) {
    if ($scope.multipleSel) {
      var toAdd = [];
      for (var i in items) {
        if (!$scope.inQueue(items[i])) {
          items[i].running = false;
          toAdd.push(items[i]);
        }
      }

      $scope.tcQueue = $scope.tcQueue.slice(0, index)
        .concat(toAdd)
        .concat($scope.tcQueue.slice(index));
    } else {
      console.log(items);
      if (items.hasOwnProperty('testCases')) {
        $scope.multipleSel = true;
        return $scope.drop($scope.tcQueue, items.testCases, index);
      }
      var id = -1;
      for (var j in $scope.tcQueue) {
        if ($scope.tcQueue[j].id === items.id) {
          id = j;
        }
      }
      console.log("ID " + id);
      if (id > -1) {
        $scope.tcQueue.splice(id, 1);
        if (index > id)
          index = index - 1;
      }
      items.running = false;
      $scope.tcQueue.splice(index, 0, items);

    }
    $scope.multipleSel = false;
    return true;
  };

  $scope.onMoved = function(list) {
    $scope.selected = [];
  };

  $scope.dragMoved = function(index) {
    console.log(index);
  };

  $scope.inQueue = function(tc) {
    return $scope.tcQueue.find(function(item) {
      return item.id === tc.id;
    });
  };

  $scope.loadTestCases = function() {
    TestDataService.loadTestPlans().then(function(data) {
      $scope.tps = data;
    },
      function(err) {
        console.log(err);
      });
  };

  $scope.selectTC = function(tc) {
    $scope.selectedTC = tc;
    $scope.selectedTP = null;
  };

  $scope.selectTP = function(tp) {
    $scope.selectedTP = tp;
    $scope.selectedTC = null;
  };

  $scope.addQueue = function(tc) {
    tc.running = false;
    $scope.tcQueue.push(tc);
  };

  $scope.exe = function() {
    console.log($scope.tcQueue.length);
    $scope.exec = true;
    $http.get('api/exec/start/' + $scope.selectedConfig.id).then(function(response) {
      if (response.data) {
    	$scope.running = true;
    	$scope.executed = 0;
    	$scope.all = $scope.tcQueue.length;
        $scope.execT(0);
      }
    });
  };

  $scope.rp = 0;
  $scope.showResults = false;
  $scope.report = {};
  $scope.aggregate = {};
  $scope.running = false;
  $scope.executed = 0;
  $scope.all = 0;
  $scope.progress = 0;

  $scope.execT = function(id) {
    console.log("Exec :" + id);
    $scope.progress = Math.floor(($scope.executed / $scope.all) * 100);
    if (id < $scope.tcQueue.length) {
      console.log("Start :" + id);
      $scope.tcQueue[id].running = true;
      $http.get('api/exec/tc/' + $scope.tcQueue[id].id).then(function(response) {
        if (response.data) {
          var tc =  $scope.tcQueue[id];
          $scope.tcQueue[id].running = false;
          $scope.tcQueue[id]._s = true;
          $scope.tcQueue[id]._events = response.data.events;
          $scope.tcQueue[id]._events.cmp = $scope.completion(tc._events.f, tc._events.p, tc._events.u, tc._events.w);
          $scope.tcQueue[id]._events.crt = $scope.correctness(tc._events.f, tc._events.p, tc._events.u, tc._events.w);
          $scope.tcQueue[id]._fc = response.data.forecasts;
          $scope.tcQueue[id]._fc.cmp = $scope.completion(tc._fc.f,tc._fc.p,tc._fc.u,tc._fc.w)
          $scope.tcQueue[id]._fc.crt = $scope.correctness(tc._fc.f,tc._fc.p,tc._fc.u,tc._fc.w)
        } else {
          $scope.tcQueue[id].running = false;
          $scope.tcQueue[id]._s = false;
        }
        $scope.executed++;
        $scope.execT(id + 1);
      });
    } else {
      $http.get('api/exec/collect').then(function(response) {
        $scope.report = response.data;
        $scope.rp = 0;
        console.log($scope.report);
        $http.get('api/exec/agg').then(function(response) {
          $scope.aggregate = response.data;
          $scope.showResults = true;
          $scope.running = false;
          console.log($scope.aggregate);
        });
      });
    }
  };

  $scope.goToReport = function(i) {
    $scope.rp = i;
  };

  $scope.deleteReport = function(i) {
    $scope.report.reports.splice(i, 0);
  };

  $scope.correctness = function(f, p, u, w) {
    var total = f + p + w;
    var correct = p;
    return total === 0 ? 100 : $filter('number')(correct / total, 2) * 100;
  };
  $scope.completion = function(f, p, u, w) {
    var total = f + p + w + u;
    var found = f + p + w;
    return total === 0 ? 100 : $filter('number')(found / total, 2) * 100;
  };


  $scope.eventLabel = function(event) {
    if (!event.vaccination.date)
      return "";
    if (event.vaccination.date._type) {
      if (event.vaccination.date._type === 'fixed')
        return $filter('date')(event.vaccination.date.fixed.date, "MM/dd/yyyy");
      else if (event.vaccination.date._type === 'relative')
        return "Relative";
      else
        return "Invalid Date";
    }
    else
      return "";
  };

  $scope.canRun = function() {
    return $scope.selectedConfig && $scope.tcQueue.length;
  };

  $scope.deleteTCL = function(id) {
    $scope.tcQueue.splice(id, 1);
    if ($scope.report && $scope.report.reports && $scope.report.reports.length > 0) {
      $scope.report.reports.splice(i, 0);
    }
  };

  $scope.clear = function() {
    $scope.tcQueue = [];
    $scope.selectedConfig = null;
  };

  $scope.isSelectedTC = function(tc) {
    return $scope.selectedTC && $scope.selectedTC.id === tc.id;
  };

  $scope.isSelectedTP = function(tp) {
    return $scope.selectedTP === tp;
  };

});
